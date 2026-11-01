import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../api';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Poll unread count every 30 seconds (NFR-NTF-01)
  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      try {
        // Only poll if tab is visible per NFR-NTF-01
        if (document.hidden) return;
        const res = await notificationAPI.getUnreadCount();
        if (isMounted) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // Silent fail on polling
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full list when opening dropdown
  const toggleDropdown = async () => {
    if (!isOpen) {
      setLoading(true);
      try {
        const res = await notificationAPI.getAll();
        setNotifications(res.data.notifications || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationAPI.markRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        // ignore
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="btn btn-sm btn-link text-dark p-2 position-relative text-decoration-none"
        title="Notifications"
        id="notification-bell-btn"
        style={{ fontSize: '1.2rem', lineHeight: 1 }}
      >
        <i className="bi bi-bell-fill"></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.65rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-0"
          style={{ width: '340px', maxWidth: '90vw', zIndex: 1050, maxHeight: '420px', display: 'flex', flexDirection: 'column' }}
        >
          <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light rounded-top">
            <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
              <i className="bi bi-bell me-1 text-primary"></i> Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-link btn-sm p-0 text-decoration-none text-primary"
                style={{ fontSize: '0.78rem' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-auto flex-grow-1 p-2" style={{ maxHeight: '320px' }}>
            {loading ? (
              <div className="text-center py-4 text-muted" style={{ fontSize: '0.85rem' }}>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-muted" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-inbox fs-4 d-block mb-1 text-secondary"></i>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className={`p-2 mb-1 rounded-2 cursor-pointer transition-all ${
                    n.isRead ? 'bg-white text-muted' : 'bg-light text-dark fw-medium border-start border-3 border-primary'
                  }`}
                  style={{ cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-1">
                    <div>{n.message}</div>
                    {!n.isRead && (
                      <span className="badge bg-primary rounded-circle p-1" style={{ width: '7px', height: '7px', padding: 0 }}></span>
                    )}
                  </div>
                  <div className="text-secondary mt-1" style={{ fontSize: '0.7rem' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
