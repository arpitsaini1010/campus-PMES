import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marksAPI } from '../api';

const MyMarks = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'Theory' | 'Practical'
  const [selectedSemester, setSelectedSemester] = useState(null);

  useEffect(() => {
    fetchMyMarks();
  }, []);

  const fetchMyMarks = async (sem = null) => {
    setLoading(true);
    setError('');
    try {
      const res = await marksAPI.getMyMarksReport(sem);
      setData(res.data);
      if (res.data?.student?.selectedSemester) {
        setSelectedSemester(res.data.student.selectedSemester);
      }
    } catch (err) {
      console.error('Fetch marks error:', err);
      setError(err.response?.data?.message || 'Error loading academic marks.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSemester = (sem) => {
    setSelectedSemester(sem);
    fetchMyMarks(sem);
  };

  const subjects = data?.subjects || [];
  const filteredSubjects = subjects.filter((s) => {
    if (filterType === 'ALL') return true;
    return s.type === filterType;
  });

  const summary = data?.summary || {
    totalSubjects: 0,
    totalObtained: 0,
    totalPossible: 0,
    overallPercentage: 0,
    passedCount: 0,
    failedCount: 0,
    pendingCount: 0
  };

  const currentEnrolledSem = data?.student?.currentSemester || 1;
  const availableSemesters = data?.student?.availableSemesters || [1];

  return (
    <div className="container py-3">
      {/* Page Header (Official Gradebook badge removed per user request) */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">Academic Marks & Evaluation</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>
            Consolidated marks breakdown for Theory (100M) and Practical (150M) curriculum subjects.
          </p>
        </div>

        <button
          onClick={() => fetchMyMarks(selectedSemester)}
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 shadow-sm"
          title="Refresh Marks"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* SECTION 1: University Marking Scheme Guidance Banner */}
      <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', borderLeft: '4px solid #4f46e5' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-start gap-3">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#4f46e5',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <i className="bi bi-info-circle-fill fs-5"></i>
            </div>
            <div className="flex-grow-1">
              <h6 className="fw-bold text-dark mb-1">University Evaluation & Passing Rules</h6>
              <div className="row g-2 pt-1" style={{ fontSize: '0.82rem' }}>
                <div className="col-md-6">
                  <div className="bg-white p-2 rounded border">
                    <span className="badge bg-primary me-2">Theory Subjects</span>
                    <strong>100 Marks Max</strong> (Passing: <span className="text-success fw-bold">40 Marks</span>)
                    <div className="text-muted mt-1">
                      Minor: 20M, Major: 60M, Test/Quiz: 10M, Assignment: 10M
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="bg-white p-2 rounded border">
                    <span className="badge bg-warning text-dark me-2">Practical Subjects</span>
                    <strong>150 Marks Max</strong> (Passing: <span className="text-success fw-bold">60 Marks</span>)
                    <div className="text-muted mt-1">
                      Minor: 20M, Major: 60M, Test/Quiz: 10M, Assignment: 10M, Practical: 50M
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEMESTER SELECTOR BAR (Placed between Section 1 and Section 2) */}
      <div className="card border-0 shadow-sm mb-4 bg-white" style={{ borderLeft: '4px solid #0ea5e9' }}>
        <div className="card-body p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-1 text-dark fw-bold" style={{ fontSize: '0.88rem' }}>
                <i className="bi bi-calendar3 text-primary me-1"></i>
                <span>Academic Semester View:</span>
              </div>
              <div className="btn-group btn-group-sm" role="group">
                {availableSemesters.map((sem) => {
                  const isCurrent = sem === currentEnrolledSem;
                  const isSelected = sem === (selectedSemester || data?.student?.selectedSemester);
                  return (
                    <button
                      key={sem}
                      type="button"
                      className={`btn px-3 py-1 ${
                        isSelected ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
                      }`}
                      style={{ fontSize: '0.82rem', fontWeight: isSelected ? '700' : '500' }}
                      onClick={() => handleSelectSemester(sem)}
                    >
                      Semester {sem}
                      {isCurrent && (
                        <span className="badge bg-light text-primary ms-1" style={{ fontSize: '0.62rem' }}>
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
              <span className="badge bg-light text-secondary border">
                <i className="bi bi-shield-lock me-1 text-primary"></i>
                Maximum View: Semester {currentEnrolledSem}
              </span>
              <span className="text-muted">
                Department: <strong className="text-dark">{data?.student?.departmentName || 'BCA'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Summary KPI Cards & Grade Breakdown */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-primary">
            <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              Enrolled Subjects (Sem {selectedSemester || currentEnrolledSem})
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-1">
              <span className="fs-3 fw-bold text-dark">{summary.totalSubjects}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Course modules</span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-info">
            <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              Aggregate Score
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-1">
              <span className="fs-3 fw-bold text-dark">{summary.totalObtained}</span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>/ {summary.totalPossible}</span>
            </div>
            <div className="text-primary fw-semibold" style={{ fontSize: '0.8rem' }}>
              {summary.overallPercentage}% overall
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-success">
            <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              Subjects Passed
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-1">
              <span className="fs-3 fw-bold text-success">{summary.passedCount}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>cleared</span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-warning">
            <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              Pending / Needs Attention
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-1">
              <span className="fs-3 fw-bold text-warning">{summary.pendingCount}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>pending / {summary.failedCount} fail</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilterType('ALL')}
          >
            All Subjects ({subjects.length})
          </button>
          <button
            type="button"
            className={`btn ${filterType === 'Theory' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilterType('Theory')}
          >
            Theory ({subjects.filter((s) => s.type === 'Theory').length})
          </button>
          <button
            type="button"
            className={`btn ${filterType === 'Practical' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilterType('Practical')}
          >
            Practical ({subjects.filter((s) => s.type === 'Practical').length})
          </button>
        </div>

        <Link to="/assignments" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
          <i className="bi bi-journal-text"></i>
          <span>View Submitted Files</span>
        </Link>
      </div>

      {/* Main Subjects Marks List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-secondary">Loading academic records...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="pmes-card text-center py-5">
          <i className="bi bi-award fs-1 text-secondary mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Subjects Found</h5>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            No subjects are registered for Semester {selectedSemester || currentEnrolledSem}.
            {availableSemesters.length > 1 && (
              <span className="d-block mt-2">
                Try selecting a previous semester above to view your historical evaluation records.
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredSubjects.map((subj) => {
            const isPractical = subj.type === 'Practical';
            const hasScore = subj.totalMarks !== null && subj.totalMarks !== undefined;
            const isPassed = subj.isPassed === true;
            const passPct = subj.maxMarks > 0 && hasScore ? ((subj.totalMarks / subj.maxMarks) * 100).toFixed(1) : 0;

            return (
              <div key={subj.subjectId} className="col-12">
                <div
                  className="pmes-card p-4 shadow-sm"
                  style={{
                    borderLeft: `5px solid ${
                      !hasScore ? '#cbd5e1' : isPassed ? '#10b981' : '#ef4444'
                    }`
                  }}
                >
                  {/* Subject Header */}
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 border-bottom pb-3 mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-light text-primary border fw-bold" style={{ fontSize: '0.82rem' }}>
                          {subj.code}
                        </span>
                        <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '1.25rem' }}>
                          {subj.name}
                        </h4>
                        <span
                          className={`badge ${
                            isPractical ? 'scheme-badge-practical' : 'scheme-badge-theory'
                          }`}
                          style={{ fontSize: '0.74rem' }}
                        >
                          <i className={`bi ${isPractical ? 'bi-laptop' : 'bi-book'} me-1`}></i>
                          {subj.type} ({subj.maxMarks} Marks)
                        </span>
                      </div>

                      <div className="text-muted d-flex align-items-center gap-3" style={{ fontSize: '0.82rem' }}>
                        {subj.faculty ? (
                          <span>
                            <i className="bi bi-person-badge me-1"></i>
                            Faculty: <strong>{subj.faculty.name}</strong> ({subj.faculty.designation || 'Instructor'})
                          </span>
                        ) : (
                          <span>
                            <i className="bi bi-person-x me-1"></i>
                            Faculty: <em>Unassigned</em>
                          </span>
                        )}
                        <span className="text-muted opacity-50">|</span>
                        <span>
                          Passing Mark: <strong className="text-dark">{subj.passingMarks} / {subj.maxMarks}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Result Badge */}
                    <div className="text-end">
                      {hasScore ? (
                        <div>
                          <span
                            className={`badge px-3 py-2 fw-bold ${
                              isPassed ? 'bg-success text-white' : 'bg-danger text-white'
                            }`}
                            style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}
                          >
                            <i className={`bi ${isPassed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
                            {isPassed ? 'PASS' : 'FAIL'}
                          </span>
                          <div className="fw-bold text-dark mt-1" style={{ fontSize: '1.2rem' }}>
                            {subj.totalMarks}{' '}
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                              / {subj.maxMarks} ({passPct}%)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="badge bg-secondary bg-opacity-25 text-secondary border px-3 py-2 fw-semibold">
                            <i className="bi bi-clock-history me-1"></i>
                            PENDING EVALUATION
                          </span>
                          <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                            Marks not entered yet
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Component Breakdown Cards */}
                  <div className="mb-3">
                    <div className="text-muted fw-semibold mb-2" style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                      EVALUATION BREAKDOWN:
                    </div>

                    <div className="row g-2">
                      {/* Minor Exam */}
                      <div className={isPractical ? 'col-6 col-md-2' : 'col-6 col-md-3'}>
                        <div className="bg-light p-2 rounded text-center border h-100">
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Minor Exams (20)
                          </div>
                          <div className="fw-bold fs-5 text-dark mt-1">
                            {subj.scores.minorExam !== null ? subj.scores.minorExam : '-'}
                            <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}> / 20</span>
                          </div>
                        </div>
                      </div>

                      {/* Major Exam */}
                      <div className={isPractical ? 'col-6 col-md-2' : 'col-6 col-md-3'}>
                        <div className="bg-light p-2 rounded text-center border h-100">
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Major Exam (60)
                          </div>
                          <div className="fw-bold fs-5 text-dark mt-1">
                            {subj.scores.majorExam !== null ? subj.scores.majorExam : '-'}
                            <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}> / 60</span>
                          </div>
                        </div>
                      </div>

                      {/* Test / Quiz */}
                      <div className={isPractical ? 'col-6 col-md-2' : 'col-6 col-md-3'}>
                        <div className="bg-light p-2 rounded text-center border h-100">
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Test / Quiz (10)
                          </div>
                          <div className="fw-bold fs-5 text-dark mt-1">
                            {subj.scores.testQuiz !== null ? subj.scores.testQuiz : '-'}
                            <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}> / 10</span>
                          </div>
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className={isPractical ? 'col-6 col-md-2' : 'col-6 col-md-3'}>
                        <div className="bg-light p-2 rounded text-center border h-100">
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Assignment (10)
                          </div>
                          <div className="fw-bold fs-5 text-dark mt-1">
                            {subj.scores.assignment !== null ? subj.scores.assignment : '-'}
                            <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}> / 10</span>
                          </div>
                        </div>
                      </div>

                      {/* Practical (Only for Practical subjects) */}
                      {isPractical && (
                        <div className="col-12 col-md-4">
                          <div className="bg-warning bg-opacity-10 p-2 rounded text-center border border-warning h-100">
                            <div className="text-warning-emphasis fw-semibold" style={{ fontSize: '0.72rem' }}>
                              Practical Lab (50)
                            </div>
                            <div className="fw-bold fs-5 text-dark mt-1">
                              {subj.scores.practical !== null ? subj.scores.practical : '-'}
                              <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}> / 50</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Against Passing Threshold */}
                  {hasScore && (
                    <div className="mt-3 pt-2">
                      <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                        <span>
                          Score: <strong>{subj.totalMarks} / {subj.maxMarks}</strong>
                        </span>
                        <span>
                          Passing Mark Threshold: <strong>{subj.passingMarks}</strong>
                        </span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className={`progress-bar ${isPassed ? 'bg-success' : 'bg-danger'}`}
                          role="progressbar"
                          style={{ width: `${Math.min(100, passPct)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Faculty Remarks & Grading Metadata */}
                  {(subj.remarks || subj.gradedAt) && (
                    <div className="mt-3 pt-2 border-top d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                      {subj.remarks ? (
                        <div className="text-secondary fst-italic">
                          <i className="bi bi-chat-quote me-1 text-primary"></i>
                          Faculty Note: &ldquo;{subj.remarks}&rdquo;
                        </div>
                      ) : (
                        <div></div>
                      )}

                      {subj.gradedAt && (
                        <div className="text-muted">
                          <i className="bi bi-calendar-check me-1"></i>
                          Graded on: {new Date(subj.gradedAt).toLocaleDateString()} at{' '}
                          {new Date(subj.gradedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyMarks;
