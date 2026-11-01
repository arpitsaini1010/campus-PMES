import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const TopBar = ({ onToggleSidebar }) => {
  const { user, role, isAuthenticated } = useAuth();
  const { isPositivus, toggleTheme } = useTheme();

  const getDynamicCourse = () => {
    if (role === 'admin') return null; // Admin oversees all courses independently

    // 1. Direct department code or student program
    const directCode = user?.department?.code || user?.program;
    if (directCode && typeof directCode === 'string') {
      const upper = directCode.trim().toUpperCase();
      if (upper.includes('BTECH') || upper.includes('CSE')) return 'BTECH';
      if (upper.includes('MCA')) return 'MCA';
      if (upper.includes('BCA')) return 'BCA';
      return upper;
    }

    // 2. Department name matching
    const name = (user?.departmentName || user?.department?.name || '').toLowerCase();
    if (name.includes('bachelor of technology') || name.includes('btech') || name.includes('engineering') || name.includes('cse')) {
      return 'BTECH';
    }
    if (name.includes('master of computer') || name.includes('mca')) {
      return 'MCA';
    }
    if (name.includes('bachelor of computer') || name.includes('bca') || name.includes('application')) {
      return 'BCA';
    }

    return '';
  };

  if (!isAuthenticated) {
    return (
      <header className="pmes-topbar py-3 px-4 shadow-sm">
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isPositivus ? '#191A23' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: isPositivus ? '2px solid #191A23' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1rem',
                color: isPositivus ? '#B9FF66' : '#ffffff',
                boxShadow: isPositivus ? '2px 2px 0 #191A23' : '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              CP
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '1rem', lineHeight: '1.1' }}>
                Campus PMES
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', letterSpacing: '0.04em', fontWeight: 600 }}>
                Career Point University
              </div>
            </div>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-sm btn-pmes-primary" id="topbar-login-btn">
              Log In
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="pmes-topbar shadow-sm">
      <div className="d-flex align-items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          className="btn btn-sm btn-outline-secondary d-lg-none border-0 p-1"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          id="btn-sidebar-toggle"
        >
          <i className="bi bi-list fs-3 text-dark"></i>
        </button>

        {/* Role Portal Indicator - Clean Neutral in Positivus, no unnecessary green */}
        <div className="d-flex align-items-center gap-2">
          {role === 'faculty' && (
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill fw-bold role-indicator-pill" style={{ fontSize: '0.82rem', background: isPositivus ? '#F3F3F3' : '#ECFDF5', color: isPositivus ? '#191A23' : '#065F46', border: isPositivus ? '1.5px solid #191A23' : '1px solid #A7F3D0' }}>
              <i className="bi bi-person-video3"></i>
              <span>Faculty Portal</span>
            </div>
          )}
          {role === 'admin' && (
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill fw-bold role-indicator-pill" style={{ fontSize: '0.82rem', background: isPositivus ? '#191A23' : '#FFF1F2', color: isPositivus ? '#FFFFFF' : '#9F1239', border: isPositivus ? '1.5px solid #191A23' : '1px solid #FDA4AF' }}>
              <i className="bi bi-shield-lock-fill" style={{ color: isPositivus ? '#B9FF66' : undefined }}></i>
              <span>Admin Portal</span>
            </div>
          )}
          {role === 'student' && (
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill fw-bold role-indicator-pill" style={{ fontSize: '0.82rem', background: isPositivus ? '#F3F3F3' : '#EEF2FF', color: isPositivus ? '#191A23' : '#3730A3', border: isPositivus ? '1.5px solid #191A23' : '1px solid #C7D2FE' }}>
              <i className="bi bi-mortarboard-fill"></i>
              <span>Student Portal</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="d-flex align-items-center gap-3">
        {/* Notifications */}
        <NotificationBell />

        {/* Dynamic Course Badge for Faculty & Student (Admin is completely independent) */}
        {role !== 'admin' && getDynamicCourse() && (
          <div className="d-flex align-items-center gap-2 ps-2 border-start">
            <span className="badge bg-light text-dark border px-2 py-1 fw-bold" style={{ fontSize: '0.78rem', borderColor: isPositivus ? '#191A23' : undefined }}>
              <i className="bi bi-mortarboard me-1 text-secondary"></i>
              {getDynamicCourse()}{role === 'student' ? ` Sem ${user?.semester || 1}` : ''}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;


