import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marksAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const FacultySubjectMarks = () => {
  const { id: subjectId } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [scheme, setScheme] = useState(null);
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGradeSheet();
  }, [subjectId]);

  const fetchGradeSheet = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await marksAPI.getSubjectGradeSheet(subjectId);
      setSubject(res.data.subject);
      setScheme(res.data.scheme);
      setStats(res.data.stats);
      setStudents(res.data.students || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading subject grade sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (studentId, field, value) => {
    setStudents(prev => prev.map(row => {
      if (row.student._id !== studentId) return row;

      const updated = { ...row, [field]: value };

      // Compute live total & status
      const minor = updated.minorExam !== null && updated.minorExam !== '' ? Number(updated.minorExam) : 0;
      const major = updated.majorExam !== null && updated.majorExam !== '' ? Number(updated.majorExam) : 0;
      const quiz = updated.testQuiz !== null && updated.testQuiz !== '' ? Number(updated.testQuiz) : 0;
      const asg = updated.assignment !== null && updated.assignment !== '' ? Number(updated.assignment) : 0;
      const prac = (scheme?.type === 'Practical' && updated.practical !== null && updated.practical !== '') ? Number(updated.practical) : 0;

      const hasAny = (updated.minorExam !== null && updated.minorExam !== '') ||
                     (updated.majorExam !== null && updated.majorExam !== '') ||
                     (updated.testQuiz !== null && updated.testQuiz !== '') ||
                     (updated.assignment !== null && updated.assignment !== '') ||
                     (scheme?.type === 'Practical' && updated.practical !== null && updated.practical !== '');

      if (hasAny) {
        const total = Math.round((minor + major + quiz + asg + prac) * 100) / 100;
        const max = scheme?.totalMax || (scheme?.type === 'Practical' ? 150 : 100);
        const passMark = scheme?.passingThreshold || (scheme?.type === 'Practical' ? 60 : 40);

        updated.totalMarks = total;
        updated.percentage = Math.round(((total / max) * 100) * 10) / 10;
        updated.isPassed = total >= passMark;
      } else {
        updated.totalMarks = null;
        updated.percentage = null;
        updated.isPassed = null;
      }

      return updated;
    }));
  };

  const handleSaveStudent = async (studentId) => {
    const row = students.find(s => s.student._id === studentId);
    if (!row) return;

    setSavingRowId(studentId);
    setError('');
    setSuccess('');

    try {
      await marksAPI.saveStudentMarks(subjectId, studentId, {
        minorExam: row.minorExam,
        majorExam: row.majorExam,
        testQuiz: row.testQuiz,
        assignment: row.assignment,
        practical: row.practical,
        remarks: row.remarks
      });
      setSuccess(`Marks for ${row.student.name} saved successfully.`);
      fetchGradeSheet();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving student marks.');
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSaveBulk = async () => {
    setSavingBulk(true);
    setError('');
    setSuccess('');

    try {
      const payload = students.map(row => ({
        studentId: row.student._id,
        minorExam: row.minorExam,
        majorExam: row.majorExam,
        testQuiz: row.testQuiz,
        assignment: row.assignment,
        practical: row.practical,
        remarks: row.remarks
      }));

      const res = await marksAPI.saveBulkMarks(subjectId, payload);
      setSuccess(res.data.message || 'All student marks saved successfully.');
      fetchGradeSheet();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving marks in bulk.');
    } finally {
      setSavingBulk(false);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.student.name?.toLowerCase().includes(q) ||
      s.student.email?.toLowerCase().includes(q) ||
      s.student.enrollmentNo?.toLowerCase().includes(q)
    );
  });

  const isPractical = scheme?.type === 'Practical';
  const totalMax = isPractical ? 150 : 100;
  const passingThreshold = isPractical ? 60 : 40;

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-secondary">Loading subject grade sheet & marking scheme...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Top Breadcrumb & Action Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link
              to={role === 'admin' ? '/admin/subjects' : '/faculty/subjects'}
              className="btn btn-sm btn-outline-secondary py-1 px-2"
              title="Return to Subjects"
            >
              <i className="bi bi-arrow-left"></i>
            </Link>
            <span className="badge bg-light text-primary border fw-bold fs-6">
              {subject?.code}
            </span>
            <h2 className="fw-bold text-dark mb-0 fs-3">{subject?.name}</h2>
          </div>
          <p className="text-secondary mb-0 ms-md-4" style={{ fontSize: '0.88rem' }}>
            <span>{subject?.department?.name}</span>
            <span className="mx-2 text-muted opacity-50">|</span>
            <span>Semester {subject?.semester}</span>
            <span className="mx-2 text-muted opacity-50">|</span>
            <span>Academic Evaluation Gradebook</span>
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <a
            href={marksAPI.exportCSVUrl(subjectId)}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            title="Download complete marks as CSV"
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
            <span>Export CSV</span>
          </a>
          <button
            onClick={handleSaveBulk}
            className="btn btn-sm btn-pmes-primary d-flex align-items-center gap-1"
            disabled={savingBulk || students.length === 0}
          >
            {savingBulk ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                <span>Saving All...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2-all"></i>
                <span>Save All Marks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.88rem' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </div>
      )}

      {success && (
        <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.88rem' }}>
          <i className="bi bi-check-circle-fill me-2"></i>{success}
        </div>
      )}

      {/* University Marking Scheme Card */}
      <div className="pmes-card p-4 mb-4 shadow-sm border-0" style={{ borderLeft: `5px solid ${isPractical ? '#10B981' : '#6366F1'}` }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 mb-3 gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge rounded-pill ${isPractical ? 'bg-success text-white' : 'bg-primary text-white'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
                <i className={`bi ${isPractical ? 'bi-flask' : 'bi-book'} me-1`}></i>
                {isPractical ? 'PRACTICAL SUBJECT SCHEME' : 'THEORETICAL SUBJECT SCHEME'}
              </span>
              <span className="fw-bold text-dark fs-5">
                Maximum Score: {totalMax} Marks
              </span>
            </div>
            <div className="text-secondary mt-1" style={{ fontSize: '0.85rem' }}>
              Statutory academic evaluation components per Career Point University curriculum guidelines.
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="p-2 px-3 rounded-3 bg-light border text-center">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>PASSING THRESHOLD</div>
              <div className="fw-bold text-success fs-5">
                {passingThreshold} / {totalMax} Marks ({Math.round((passingThreshold / totalMax) * 100)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Scheme Component Breakdown Badges */}
        <div className="row g-2">
          <div className="col-6 col-md">
            <div className="p-2 rounded bg-light border text-center">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>MINOR EXAMS</div>
              <div className="fw-bold text-dark fs-6">Max: 20 Marks</div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="p-2 rounded bg-light border text-center">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>MAJOR EXAM</div>
              <div className="fw-bold text-dark fs-6">Max: 60 Marks</div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="p-2 rounded bg-light border text-center">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>TEST / QUIZ</div>
              <div className="fw-bold text-dark fs-6">Max: 10 Marks</div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="p-2 rounded bg-light border text-center">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>ASSIGNMENT</div>
              <div className="fw-bold text-dark fs-6">Max: 10 Marks</div>
            </div>
          </div>
          {isPractical && (
            <div className="col-12 col-md">
              <div className="p-2 rounded bg-success-subtle border border-success-subtle text-center">
                <div className="text-success fw-bold" style={{ fontSize: '0.7rem' }}>PRACTICAL / LAB</div>
                <div className="fw-bold text-success fs-6">Max: 50 Marks</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cohort KPI Metrics & Search Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div className="d-flex flex-wrap gap-2">
          <span className="badge bg-white text-dark border p-2 px-3 rounded-pill shadow-xs" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-people me-1 text-primary"></i> Total Students: <strong>{stats?.totalStudents || 0}</strong>
          </span>
          <span className="badge bg-white text-dark border p-2 px-3 rounded-pill shadow-xs" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-check-circle me-1 text-info"></i> Graded: <strong>{stats?.gradedCount || 0}</strong>
          </span>
          <span className="badge bg-white text-dark border p-2 px-3 rounded-pill shadow-xs" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-trophy me-1 text-success"></i> Passed: <strong className="text-success">{stats?.passedCount || 0}</strong>
          </span>
          <span className="badge bg-white text-dark border p-2 px-3 rounded-pill shadow-xs" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-x-circle me-1 text-danger"></i> Failed: <strong className="text-danger">{stats?.failedCount || 0}</strong>
          </span>
          {stats?.gradedCount > 0 && (
            <span className="badge bg-white text-dark border p-2 px-3 rounded-pill shadow-xs" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-bar-chart me-1 text-warning"></i> Class Average: <strong>{stats?.averageMarks} / {totalMax}</strong>
            </span>
          )}
        </div>

        <div style={{ minWidth: '240px' }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search student or enroll #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grade Sheet Table */}
      <div className="pmes-card p-0 shadow-sm border overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-people display-4 d-block mb-2"></i>
            No students found enrolled in {subject?.department?.name} Semester {subject?.semester}.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pmes-table align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Student Details</th>
                  <th style={{ width: '90px' }} className="text-center">Minor (20)</th>
                  <th style={{ width: '90px' }} className="text-center">Major (60)</th>
                  <th style={{ width: '90px' }} className="text-center">Quiz (10)</th>
                  <th style={{ width: '90px' }} className="text-center">Assign (10)</th>
                  {isPractical && (
                    <th style={{ width: '100px' }} className="text-center bg-success-subtle text-success">
                      Practical (50)
                    </th>
                  )}
                  <th style={{ width: '110px' }} className="text-center">Total ({totalMax})</th>
                  <th style={{ width: '100px' }} className="text-center">Status</th>
                  <th style={{ minWidth: '160px' }}>Faculty Remarks</th>
                  <th style={{ width: '70px' }} className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((row) => {
                  const st = row.student;
                  const isSaving = savingRowId === st._id;

                  return (
                    <tr key={st._id}>
                      <td>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>{st.name}</div>
                        <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.74rem' }}>
                          <span>Enroll: <strong>{st.enrollmentNo || '—'}</strong></span>
                          <span className="text-muted opacity-50">|</span>
                          <span>{st.email}</span>
                        </div>
                      </td>

                      {/* Minor Exam: 20 */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          className="form-control form-control-sm text-center font-monospace"
                          value={row.minorExam !== null && row.minorExam !== undefined ? row.minorExam : ''}
                          onChange={(e) => handleInputChange(st._id, 'minorExam', e.target.value)}
                          placeholder="—"
                        />
                      </td>

                      {/* Major Exam: 60 */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.5"
                          className="form-control form-control-sm text-center font-monospace"
                          value={row.majorExam !== null && row.majorExam !== undefined ? row.majorExam : ''}
                          onChange={(e) => handleInputChange(st._id, 'majorExam', e.target.value)}
                          placeholder="—"
                        />
                      </td>

                      {/* Test / Quiz: 10 */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          className="form-control form-control-sm text-center font-monospace"
                          value={row.testQuiz !== null && row.testQuiz !== undefined ? row.testQuiz : ''}
                          onChange={(e) => handleInputChange(st._id, 'testQuiz', e.target.value)}
                          placeholder="—"
                        />
                      </td>

                      {/* Assignment: 10 */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          className="form-control form-control-sm text-center font-monospace"
                          value={row.assignment !== null && row.assignment !== undefined ? row.assignment : ''}
                          onChange={(e) => handleInputChange(st._id, 'assignment', e.target.value)}
                          placeholder="—"
                        />
                      </td>

                      {/* Practical: 50 (Only for practical subjects) */}
                      {isPractical && (
                        <td className="bg-success-subtle bg-opacity-25">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            className="form-control form-control-sm text-center font-monospace border-success"
                            value={row.practical !== null && row.practical !== undefined ? row.practical : ''}
                            onChange={(e) => handleInputChange(st._id, 'practical', e.target.value)}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Total Marks */}
                      <td className="text-center">
                        {row.totalMarks !== null ? (
                          <div>
                            <span className="fw-bold fs-6 text-dark">{row.totalMarks}</span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}> / {totalMax}</span>
                            <div className="text-muted" style={{ fontSize: '0.68rem' }}>{row.percentage}%</div>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Result Status */}
                      <td className="text-center">
                        {row.isPassed !== null ? (
                          <span className={`badge rounded-pill ${row.isPassed ? 'bg-success text-white' : 'bg-danger text-white'}`} style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                            <i className={`bi ${row.isPassed ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                            {row.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        ) : (
                          <span className="badge bg-light text-secondary border" style={{ fontSize: '0.7rem' }}>
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Good performance"
                          value={row.remarks || ''}
                          onChange={(e) => handleInputChange(st._id, 'remarks', e.target.value)}
                        />
                      </td>

                      {/* Action */}
                      <td className="text-end">
                        <button
                          onClick={() => handleSaveStudent(st._id)}
                          className="btn btn-sm btn-outline-primary"
                          title="Save student marks"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <i className="bi bi-save"></i>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultySubjectMarks;

