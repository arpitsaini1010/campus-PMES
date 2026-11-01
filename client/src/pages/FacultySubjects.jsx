import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectAPI, assignmentAPI } from '../api';

const FacultySubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjRes, asgRes] = await Promise.all([
        subjectAPI.getAll(),
        assignmentAPI.getAll()
      ]);
      setSubjects(subjRes.data.subjects || []);
      setAssignments(asgRes.data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading subjects.');
    } finally {
      setLoading(false);
    }
  };

  // Group subjects by semester (FR-DEP-07)
  const groupedBySemester = subjects.reduce((acc, subj) => {
    const sem = subj.semester || 1;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(subj);
    return acc;
  }, {});

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">My Allocated Subjects</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Course curriculum and student evaluation gradebooks grouped by semester.
          </p>
        </div>

        <Link to="/faculty/assignments/new" className="btn btn-pmes-primary">
          <i className="bi bi-plus-lg me-1"></i> Post New Assignment
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-secondary">Loading assigned curriculum...</p>
        </div>
      ) : Object.keys(groupedBySemester).length === 0 ? (
        <div className="pmes-card text-center py-5">
          <i className="bi bi-book fs-1 text-secondary mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Subjects Allocated Yet</h5>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Department administrators have not yet allocated subjects to your faculty profile.
          </p>
        </div>
      ) : (
        Object.entries(groupedBySemester).map(([semester, subjList]) => (
          <div key={semester} className="mb-4">
            <h5 className="fw-bold text-dark border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
              <span className="badge bg-primary rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
                Semester {semester}
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                ({subjList.length} Subject{subjList.length > 1 ? 's' : ''})
              </span>
            </h5>

            <div className="row g-3">
              {subjList.map(subj => {
                const subjAssignments = assignments.filter(a => a.subject?._id === subj._id || a.subject === subj._id);
                return (
                  <div key={subj._id} className="col-12 col-md-6 col-lg-4">
                    <div className="pmes-card h-100 p-4 d-flex flex-column justify-content-between shadow-sm">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-light text-primary border" style={{ fontSize: '0.75rem' }}>
                            {subj.code}
                          </span>
                          {subj.type === 'Practical' ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-flask me-1"></i>Practical (150M, Pass: 60)
                            </span>
                          ) : (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-book me-1"></i>Theory (100M, Pass: 40)
                            </span>
                          )}
                        </div>

                        <h5 className="fw-bold text-dark mb-1">{subj.name}</h5>
                        <p className="text-secondary mb-2" style={{ fontSize: '0.8rem' }}>
                          <span>{subj.department?.name || 'Department'}</span>
                          <span className="mx-2 text-muted opacity-50">|</span>
                          <span>Semester {subj.semester}</span>
                        </p>
                        <p className="text-secondary mb-0" style={{ fontSize: '0.82rem' }}>
                          Active Coursework: <strong>{subjAssignments.length} assignment(s)</strong>
                        </p>
                      </div>

                      <div className="border-top pt-3 mt-3">
                        <div className="d-flex gap-2">
                          <Link
                            to={`/faculty/subjects/${subj._id}/marks`}
                            className="btn btn-sm btn-pmes-primary flex-grow-1"
                            title="Manage Student Marks & Evaluation Scheme"
                          >
                            <i className="bi bi-award me-1"></i> Gradebook
                          </Link>
                          <Link
                            to={`/faculty/assignments/new?subjectId=${subj._id}`}
                            className="btn btn-sm btn-outline-secondary"
                            title="Post coursework assignment"
                          >
                            <i className="bi bi-plus-circle"></i>
                          </Link>
                        </div>

                        {subjAssignments.length > 0 && (
                          <div className="mt-3 pt-2 border-top">
                            <div className="text-muted fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
                              Recent Assignments:
                            </div>
                            <div className="d-flex flex-column gap-1">
                              {subjAssignments.slice(0, 3).map(asg => (
                                <Link
                                  key={asg._id}
                                  to={`/assignments/${asg._id}/tracker`}
                                  className="text-decoration-none text-dark d-flex justify-content-between align-items-center p-1 rounded bg-light"
                                  style={{ fontSize: '0.78rem' }}
                                >
                                  <span className="text-truncate" style={{ maxWidth: '180px' }}>
                                    {asg.title}
                                  </span>
                                  <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                                    Tracker
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
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

export default FacultySubjects;
