import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');

  const maxSemester = user?.semester || 6;
  const availableSemesters = Array.from({ length: maxSemester }, (_, i) => i + 1);

  useEffect(() => {
    fetchAssignments();
  }, [selectedSemester]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = selectedSemester !== 'ALL' ? { semester: selectedSemester } : {};
      const res = await assignmentAPI.getAll(params);
      setAssignments(res.data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading assignments.');
    } finally {
      setLoading(false);
    }
  };

  // Group assignments by subject
  const groupedBySubject = assignments.reduce((acc, asg) => {
    const subjName = asg.subject?.name || 'General';
    const subjCode = asg.subject?.code || '';
    const key = `${subjCode} - ${subjName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asg);
    return acc;
  }, {});

  const getStatusBadge = (state) => {
    switch (state) {
      case 'Graded':
        return <span className="badge bg-success">Graded</span>;
      case 'Submitted':
        return <span className="badge bg-primary">Submitted</span>;
      case 'Late':
        return <span className="badge bg-danger">Late Submission</span>;
      case 'Pending':
      default:
        return <span className="badge bg-warning text-dark">Pending</span>;
    }
  };

  const filteredSubjects = Object.keys(groupedBySubject).reduce((acc, key) => {
    const list = groupedBySubject[key].filter(a => {
      if (filterStatus === 'ALL') return true;
      return a.studentState === filterStatus;
    });
    if (list.length > 0) acc[key] = list;
    return acc;
  }, {});

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">Projects & Assignments</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Coursework, term projects, and practical tasks assigned by your faculty.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="btn-group btn-group-sm">
          {['ALL', 'Pending', 'Submitted', 'Late', 'Graded'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Semester Filter Bar */}
      <div className="pmes-card p-3 mb-4 shadow-sm bg-white">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar3 text-primary"></i>
            <span className="fw-semibold text-dark" style={{ fontSize: '0.88rem' }}>Academic Semester:</span>
          </div>
          <div className="d-flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedSemester('ALL')}
              className={`btn btn-sm ${selectedSemester === 'ALL' ? 'btn-pmes-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.78rem' }}
            >
              All Semesters
            </button>
            {availableSemesters.map(sem => {
              const isSelected = Number(selectedSemester) === sem;
              const isCurrent = sem === (user?.semester || 1);
              return (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`btn btn-sm ${isSelected ? 'btn-pmes-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.78rem' }}
                >
                  Semester {sem} {isCurrent && <span className="badge bg-light text-dark ms-1" style={{ fontSize: '0.65rem' }}>Current</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-secondary" style={{ fontSize: '0.85rem' }}>Loading coursework...</p>
        </div>
      ) : Object.keys(filteredSubjects).length === 0 ? (
        <div className="pmes-card text-center py-5">
          <i className="bi bi-journal-x fs-1 text-secondary mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Assignments Found</h5>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {filterStatus === 'ALL'
              ? 'No assignments are currently posted for your department and semester.'
              : `No assignments matching the '${filterStatus}' filter.`}
          </p>
        </div>
      ) : (
        Object.entries(filteredSubjects).map(([subjTitle, asgList]) => (
          <div key={subjTitle} className="mb-4">
            <h5 className="fw-bold text-dark border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-book-half text-primary"></i>
              {subjTitle}
              <span className="badge bg-light text-secondary border ms-auto" style={{ fontSize: '0.75rem' }}>
                {asgList.length} Assignment{asgList.length > 1 ? 's' : ''}
              </span>
            </h5>

            <div className="row g-3">
              {asgList.map(asg => {
                const isOverdue = new Date() > new Date(asg.dueDate) && asg.studentState === 'Pending';
                return (
                  <div key={asg._id} className="col-12 col-md-6 col-lg-4">
                    <div className="pmes-card h-100 p-3 d-flex flex-column justify-content-between shadow-sm">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-1">
                            {asg.type === 'project' ? (
                              <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.7rem' }}>
                                <i className="bi bi-folder-fill me-1"></i> Project
                              </span>
                            ) : (
                              <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>
                                <i className="bi bi-journal-text me-1"></i> Assignment
                              </span>
                            )}
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                              Max: {asg.maxMarks} Marks
                            </span>
                          </div>
                          {getStatusBadge(asg.studentState)}
                        </div>

                        <h6 className="fw-bold text-dark mb-1">{asg.title}</h6>
                        <p className="text-secondary text-truncate-2 mb-3" style={{ fontSize: '0.82rem' }}>
                          {asg.description}
                        </p>
                      </div>

                      <div className="border-top pt-2">
                        <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.78rem' }}>
                          <span className="text-muted">Due Date:</span>
                          <span className={isOverdue ? 'text-danger fw-bold' : 'text-dark fw-medium'}>
                            {new Date(asg.dueDate).toLocaleDateString()} {new Date(asg.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {asg.mySubmission?.marks !== null && asg.mySubmission?.marks !== undefined && (
                          <div className="d-flex justify-content-between align-items-center mb-2 bg-success bg-opacity-10 p-1 rounded" style={{ fontSize: '0.78rem' }}>
                            <span className="text-success fw-bold">Score:</span>
                            <span className="text-success fw-bold">
                              {asg.mySubmission.marks} / {asg.maxMarks}
                            </span>
                          </div>
                        )}

                        <Link
                          to={`/assignments/${asg._id}`}
                          className="btn btn-sm btn-pmes-primary w-100"
                        >
                          {asg.studentState === 'Pending' ? 'Submit Work' : 'View Submission'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Assignments;
