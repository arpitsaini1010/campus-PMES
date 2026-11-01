import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ isOpen, onClose, onOpenPasswordModal }) => {
  const { user, role, logout } = useAuth();
  const { isPositivus } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isHod = role === 'admin' || user?.isHod || user?.designation?.toLowerCase().includes('hod');

  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { to: '/admin/students', label: 'Students', icon: 'bi-mortarboard-fill' },
    { to: '/admin/users', label: 'Faculty', icon: 'bi-people-fill' },
    { to: '/admin/projects', label: 'All Projects', icon: 'bi-kanban-fill' },
    { to: '/hod/guide-allocation', label: 'Guide Allocation', icon: 'bi-person-badge-fill' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone-fill' }
  ];

  const facultyLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { to: '/faculty/assignments', label: 'Projects & Assignment', icon: 'bi-journal-plus' },
    { to: '/faculty/projects', label: 'Assigned Projects', icon: 'bi-collection-fill' },
    ...(isHod ? [{ to: '/hod/guide-allocation', label: 'Guide Allocation (HOD)', icon: 'bi-person-badge-fill' }] : []),
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone-fill' }
  ];

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { to: '/my-project', label: 'My Project', icon: 'bi-folder-fill' },
    { to: '/assignments', label: 'Projects & Assignments', icon: 'bi-journal-check' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone-fill' }
  ];

  const links = role === 'admin' ? adminLinks : role === 'faculty' ? facultyLinks : studentLinks;

  const roleTitle = role === 'admin' ? 'Admin Workspace' : role === 'faculty' ? 'Faculty Portal' : 'Student Desk';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="pmes-sidebar-backdrop d-lg-none" onClick={onClose}></div>}

      <aside className={`pmes-sidebar ${isOpen ? 'show' : ''}`} id="pmes-sidebar">
        {/* Brand Header */}
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <Link to="/" onClick={onClose} className="d-flex align-items-center gap-2 text-decoration-none">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isPositivus ? '#191A23' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: isPositivus ? '2px solid #191A23' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.15rem',
                color: isPositivus ? '#B9FF66' : '#ffffff',
                boxShadow: isPositivus ? '2px 2px 0 #191A23' : '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              CP
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '1.05rem', lineHeight: '1.1' }}>
                Campus PMES
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', letterSpacing: '0.04em', fontWeight: 600 }}>
                Career Point University
              </div>
            </div>
          </Link>
          <button className="btn-close d-lg-none" onClick={onClose} aria-label="Close sidebar"></button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow-1 px-3 py-3 overflow-auto" id="sidebar-nav">
          <div className="d-flex flex-column gap-1">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                id={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Card & Actions Footer */}
        <div className="p-3 border-top bg-light">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.95rem',
                flexShrink: 0
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden" style={{ minWidth: 0 }}>
              <div className="text-dark text-truncate fw-bold" style={{ fontSize: '0.85rem' }}>
                {user?.name}
              </div>
              <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                {user?.email}
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              onClick={onOpenPasswordModal}
              className="btn btn-sm btn-outline-secondary w-50 d-flex align-items-center justify-content-center gap-1"
              title="Change Password"
              id="sidebar-btn-change-password"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="bi bi-key"></i>
              <span>Password</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-pmes-danger w-50 d-flex align-items-center justify-content-center gap-1"
              title="Sign Out"
              id="sidebar-btn-logout"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

