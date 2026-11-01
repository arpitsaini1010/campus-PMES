import React, { useState } from 'react';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const ChangePasswordModal = ({ show, onClose, forced = false }) => {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.changePassword({
        currentPassword: forced ? undefined : currentPassword,
        newPassword
      });

      setSuccess('Password changed successfully!');
      if (user) {
        updateUser({ ...user, mustChangePassword: false });
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom bg-light">
            <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
              <i className="bi bi-shield-lock-fill me-2 text-primary"></i>
              {forced ? 'Mandatory Password Change' : 'Change Password'}
            </h5>
            {!forced && (
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {forced && (
                <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  This is your first login with an Administrator-provided temporary password. You must set a personal password to continue.
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-exclamation-circle-fill me-1"></i> {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-check-circle-fill me-1"></i> {success}
                </div>
              )}

              {!forced && (
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>New Password (min 8 characters)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="modal-footer border-top bg-light">
              {!forced && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-sm btn-primary px-3"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
