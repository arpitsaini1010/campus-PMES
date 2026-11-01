import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectAPI, evaluationAPI } from '../api';
import StatusBadge from '../components/StatusBadge';

const EvaluateProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [marks, setMarks] = useState({
    report: 25,
    implementation: 35,
    presentation: 18,
    viva: 8
  });
  const [remarks, setRemarks] = useState('');
  const [isUpdate, setIsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProjectAndEvaluation = async () => {
      try {
        setLoading(true);
        const projRes = await projectAPI.getById(id);
        setProject(projRes.data.project);

        try {
          const evalRes = await evaluationAPI.get(id);
          if (evalRes.data.evaluation) {
            setMarks(evalRes.data.evaluation.marks);
            setRemarks(evalRes.data.evaluation.remarks || '');
            setIsUpdate(true);
          }
        } catch {
          // No existing evaluation yet, use default starting rubric
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading project.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndEvaluation();
  }, [id]);

  const handleMarkChange = (field, value) => {
    const num = value === '' ? 0 : Number(value);
    setMarks({ ...marks, [field]: num });
  };

  const total = Number(marks.report || 0) +
                Number(marks.implementation || 0) +
                Number(marks.presentation || 0) +
                Number(marks.viva || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations
    if (marks.report < 0 || marks.report > 30) {
      return setError('Report marks must be between 0 and 30.');
    }
    if (marks.implementation < 0 || marks.implementation > 40) {
      return setError('Implementation marks must be between 0 and 40.');
    }
    if (marks.presentation < 0 || marks.presentation > 20) {
      return setError('Presentation marks must be between 0 and 20.');
    }
    if (marks.viva < 0 || marks.viva > 10) {
      return setError('Viva marks must be between 0 and 10.');
    }

    setSaving(true);

    try {
      const res = await evaluationAPI.save(id, { marks, remarks });
      setSuccess(res.data.message || 'Evaluation saved successfully!');
      setTimeout(() => {
        navigate(`/projects/${id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving evaluation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Project <span className="gradient-text">Evaluation Form</span>
          </h2>
          <p className="text-muted mb-0">
            Fixed 100-mark rubric evaluation as specified in Career Point University syllabus
          </p>
        </div>
        <Link to={`/projects/${id}`} className="btn btn-pmes-secondary btn-sm">
          <i className="bi bi-arrow-left me-1"></i> Back to Project
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-4" id="eval-error-alert">
          <i className="bi bi-exclamation-circle-fill me-1"></i> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2 mb-4" id="eval-success-alert">
          <i className="bi bi-check-circle-fill me-1"></i> {success}
        </div>
      )}

      <div className="row g-4">
        {/* Project Info Header Card */}
        <div className="col-12 col-lg-4">
          <div className="pmes-card h-100">
            <div className="d-flex justify-content-end align-items-center mb-2">
              <StatusBadge status={project?.status} />
            </div>

            <h4 className="fw-bold text-dark mb-2">{project?.title}</h4>
            <div className="d-flex flex-wrap gap-1 mb-3">
              <span className="program-badge">{project?.program || 'BCA'}</span>
              <span className="semester-badge">Sem {project?.semester || 5}</span>
            </div>

            <p className="text-secondary mb-4" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              {project?.description}
            </p>

            <div className="form-label mb-2">Project Team Members</div>
            <div className="d-flex flex-column gap-2 mb-4">
              {project?.members?.map((m) => (
                <div key={m._id} className="p-2 rounded bg-light border" style={{ fontSize: '0.85rem' }}>
                  <div className="text-dark fw-semibold">{m.name}</div>
                  <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    {m.email} {m.enrollmentNo && `| #${m.enrollmentNo}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-3 pmes-inner-box">
              <div className="fw-bold text-dark mb-2" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-info-circle me-1 text-primary"></i> Fixed Rubric Breakdown
              </div>
              <ul className="list-unstyled mb-0 text-secondary" style={{ fontSize: '0.8rem' }}>
                <li className="mb-1"><i className="bi bi-file-earmark-text text-primary me-2"></i>Project Report & Synopsis: 30 Marks</li>
                <li className="mb-1"><i className="bi bi-code-slash text-primary me-2"></i>Implementation & Code Quality: 40 Marks</li>
                <li className="mb-1"><i className="bi bi-easel text-primary me-2"></i>Presentation & Slides: 20 Marks</li>
                <li className="mb-1"><i className="bi bi-chat-dots text-primary me-2"></i>Viva Voce & Demonstration: 10 Marks</li>
                <li className="fw-bold text-dark mt-2 pt-2 border-top"><i className="bi bi-trophy text-warning me-2"></i>Total Maximum Score: 100 Marks</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Evaluation Input Form */}
        <div className="col-12 col-lg-8">
          <div className="pmes-card">
            <form onSubmit={handleSubmit}>
              <div className="row g-3 mb-4">
                {/* 1. Report (0-30) */}
                <div className="col-12 col-sm-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0" htmlFor="rubric-report">
                        1. Project Report
                      </label>
                      <span className="badge bg-secondary">Max 30</span>
                    </div>
                    <input
                      type="number"
                      id="rubric-report"
                      className="form-control form-control-lg text-center fw-bold"
                      min="0"
                      max="30"
                      value={marks.report}
                      onChange={(e) => handleMarkChange('report', e.target.value)}
                      required
                    />
                    <div className="text-muted text-center mt-1" style={{ fontSize: '0.75rem' }}>
                      Documentation, diagrams, SRS adherence
                    </div>
                  </div>
                </div>

                {/* 2. Implementation (0-40) */}
                <div className="col-12 col-sm-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0" htmlFor="rubric-implementation">
                        2. Implementation
                      </label>
                      <span className="badge bg-secondary">Max 40</span>
                    </div>
                    <input
                      type="number"
                      id="rubric-implementation"
                      className="form-control form-control-lg text-center fw-bold"
                      min="0"
                      max="40"
                      value={marks.implementation}
                      onChange={(e) => handleMarkChange('implementation', e.target.value)}
                      required
                    />
                    <div className="text-muted text-center mt-1" style={{ fontSize: '0.75rem' }}>
                      Architecture, features, code completeness
                    </div>
                  </div>
                </div>

                {/* 3. Presentation (0-20) */}
                <div className="col-12 col-sm-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0" htmlFor="rubric-presentation">
                        3. Presentation
                      </label>
                      <span className="badge bg-secondary">Max 20</span>
                    </div>
                    <input
                      type="number"
                      id="rubric-presentation"
                      className="form-control form-control-lg text-center fw-bold"
                      min="0"
                      max="20"
                      value={marks.presentation}
                      onChange={(e) => handleMarkChange('presentation', e.target.value)}
                      required
                    />
                    <div className="text-muted text-center mt-1" style={{ fontSize: '0.75rem' }}>
                      Clarity of slides, speaking, pacing
                    </div>
                  </div>
                </div>

                {/* 4. Viva (0-10) */}
                <div className="col-12 col-sm-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0" htmlFor="rubric-viva">
                        4. Viva Voce
                      </label>
                      <span className="badge bg-secondary">Max 10</span>
                    </div>
                    <input
                      type="number"
                      id="rubric-viva"
                      className="form-control form-control-lg text-center fw-bold"
                      min="0"
                      max="10"
                      value={marks.viva}
                      onChange={(e) => handleMarkChange('viva', e.target.value)}
                      required
                    />
                    <div className="text-muted text-center mt-1" style={{ fontSize: '0.75rem' }}>
                      Conceptual understanding, live Q&A
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Score Display Pill */}
              <div className="p-4 rounded-3 text-center mb-4" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <div className="text-uppercase text-success fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                  Calculated Total Score
                </div>
                <div className="display-4 fw-bold text-dark my-1" id="calculated-total-score">
                  {total} <span className="fs-4 text-muted">/ 100</span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {total >= 75 ? 'Distinction Grade' : total >= 60 ? 'First Class' : total >= 50 ? 'Second Class' : 'Pass / Needs Improvement'}
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-4">
                <label className="form-label" htmlFor="eval-remarks">Supervisor Remarks & Feedback</label>
                <textarea
                  id="eval-remarks"
                  className="form-control"
                  rows="3"
                  placeholder="Enter constructive remarks, commendations, or recommendations for the student team..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-pmes-success w-100 py-3 fw-bold fs-6"
                disabled={saving}
                id="btn-submit-evaluation"
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span> Saving Evaluation...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {isUpdate ? 'Update Evaluation Marks' : 'Submit Final Evaluation (Moves to Evaluated)'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluateProject;
