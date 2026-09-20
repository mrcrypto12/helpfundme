import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import { HiOutlineBell } from 'react-icons/hi2';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedPost?: { _id: string; title: string };
  createdAt: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch unread count on mount + poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {
      // silently fail
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications?limit=10');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!showPanel) {
      fetchNotifications();
    }
    setShowPanel(!showPanel);
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* */ }
    }

    // Navigate to related post
    if (notif.relatedPost?._id) {
      navigate(`/posts/${notif.relatedPost._id}`);
      setShowPanel(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* */ }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'donation_received': return '💚';
      case 'campaign_milestone': return '';
      case 'campaign_completed': return '🎉';
      case 'campaign_update': return '📢';
      case 'thank_you': return '🙏';
      case 'post_approved': return '✅';
      case 'post_declined': return '❌';
      case 'co_organizer_invite': return '🤝';
      default: return '';
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button className="navbar-btn" onClick={handleToggle}>
        <HiOutlineBell />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            background: 'var(--red)',
            color: '#fff',
            borderRadius: '9999px',
            fontSize: '0.65rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-secondary)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          {/* Mobile-only backdrop so the panel reads as a sheet, and taps outside close it */}
          <div className="notification-backdrop" onClick={() => setShowPanel(false)} />

          <div className="notification-panel">
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}></div>
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: notif.isRead ? 'transparent' : 'rgba(27, 138, 42, 0.05)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(27, 138, 42, 0.05)')}
                  >
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
                      {getNotifIcon(notif.type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: notif.isRead ? 400 : 600,
                        fontSize: '0.85rem',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {notif.title}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {timeAgo(notif.createdAt)}
                      </div>
                    </div>
                    {!notif.isRead && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        flexShrink: 0,
                        marginTop: 6,
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .notification-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 380px;
          max-width: calc(100vw - 32px);
          max-height: 480px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 300;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideDown 0.2s ease;
        }

        .notification-backdrop {
          display: none;
        }

        @media (max-width: 480px) {
          .notification-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 299;
          }

          .notification-panel {
            position: fixed;
            top: calc(var(--navbar-height, 64px) + 8px);
            left: 8px;
            right: 8px;
            width: auto;
            max-width: none;
            max-height: calc(100vh - var(--navbar-height, 64px) - 24px);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;