import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordModal from '../components/ChangePasswordModal';

const Login = () => {
  const { login } = useAuth();
  const { isPositivus, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForcedPasswordModal, setShowForcedPasswordModal] = useState(false);

  // Check if session expired
  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        setShowForcedPasswordModal(true);
      } else {
        redirectRole(user.role);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const redirectRole = (role) => {
    if (role === 'admin') navigate('/dashboard');
    else if (role === 'faculty') navigate('/dashboard');
    else navigate('/dashboard');
  };

  return (
    <>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="pmes-card shadow-lg p-4 p-md-5">
              <div className="text-center mb-4">
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
                    marginBottom: '1rem'
                  }}
                >
                  <i className="bi bi-mortarboard-fill"></i>
                </div>
                <h2 className="fw-bold mb-1 text-dark">Welcome to PMES</h2>
                <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>
                  Campus Project Management & Evaluation Portal
                </p>
              </div>

              {isExpired && (
                <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-clock-history me-1"></i> Your session has expired. Please log in again.
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }} id="login-error-alert">
                  <i className="bi bi-exclamation-circle-fill me-1"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="login-email">
                    Enrollment No / Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-person-badge text-primary"></i>
                    </span>
                    <input
                      type="text"
                      id="login-email"
                      className="form-control border-start-0"
                      placeholder="Enrollment No (K26001) or email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-text mt-1 text-muted" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-info-circle me-1"></i>Sign in with your <strong>Enrollment No</strong>, <strong>Personal Email</strong>, or <strong>University Email</strong>.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold" htmlFor="login-password">
                    Password / Temporary Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-lock text-primary"></i>
                    </span>
                    <input
                      type="password"
                      id="login-password"
                      className="form-control border-start-0"
                      placeholder="e.g. firstname@12345"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-pmes-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center text-center"
                  disabled={loading}
                  id="btn-login-submit"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Authenticating...
                    </>
                  ) : (
                    'Sign In to Portal'
                  )}
                </button>
              </form>

              {/* Institutional Notice */}
              <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: '0.82rem' }}>
                <div className="d-flex align-items-center justify-content-center gap-1 text-secondary mb-1">
                  <i className="bi bi-shield-check text-success"></i>
                  <span className="fw-semibold">Institutional Access Only</span>
                </div>
                <div>
                  Student and faculty accounts are provisioned exclusively by the Academic Administration.
                </div>
                <div className="text-secondary mt-1" style={{ fontSize: '0.75rem' }}>
                  Contact your department administrator for credential assistance or password resets.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forced Password Change Modal for accounts requiring change */}
      <ChangePasswordModal
        show={showForcedPasswordModal}
        forced={true}
        onClose={() => {
          setShowForcedPasswordModal(false);
          navigate('/dashboard');
        }}
      />
    </>
  );
};

export default Login;
