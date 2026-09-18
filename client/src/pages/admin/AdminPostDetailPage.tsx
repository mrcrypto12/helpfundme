import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IPost, IDonation, IComment, IWithdrawal, CATEGORY_LABELS } from '../../types';
import { formatCurrency, formatDateTime, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineEye, HiOutlineHeart, HiOutlineChatBubbleLeft, HiOutlineUsers } from 'react-icons/hi2';

const AdminPostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<IPost | null>(null);
  const [donations, setDonations] = useState<IDonation[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [withdrawals, setWithdrawals] = useState<IWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/posts/${id}`);
      setPost(data.post);
      setDonations(data.donations);
      setComments(data.comments);
      setWithdrawals(data.withdrawals);
    } catch {
      toast.error('Error loading post');
      navigate('/admin/posts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api.put(`/admin/posts/${id}/status`, { status, adminNotes: note, declineReason: status === 'declined' ? note : undefined });
      toast.success(`Post ${status}`);
      fetchData();
    } catch {
      toast.error('Error updating status');
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;
  if (!post) return null;

  return (
    <div className="page-container">
      <button className="btn btn-ghost" onClick={() => navigate('/admin/posts')} style={{ marginBottom: 16 }}>
        <HiOutlineArrowLeft /> Back to Post Management
      </button>

      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h1>{post.title}</h1>
            <p>by {post.author?.name} · {post.author?.email}</p>
          </div>
          <span className={`status-badge status-${post.status}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>{post.status}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon gold">₵</div></div>
          <div className="stat-card-value">{formatCurrency(post.amountRaised)}</div>
          <div className="stat-card-label">Raised of {formatCurrency(post.targetAmount)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon blue"><HiOutlineEye /></div></div>
          <div className="stat-card-value">{post.viewCount}</div>
          <div className="stat-card-label">Views</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon red"><HiOutlineHeart /></div></div>
          <div className="stat-card-value">{post.likesCount}</div>
          <div className="stat-card-label">Likes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon green"><HiOutlineUsers /></div></div>
          <div className="stat-card-value">{post.donorsCount}</div>
          <div className="stat-card-label">Donors</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Campaign Info</h3>
          <div className="info-box">
            <div className="info-box-row"><span className="info-box-label">Category</span><span className="info-box-value">{CATEGORY_LABELS[post.category]}</span></div>
            <div className="info-box-row"><span className="info-box-label">Severity</span><span className="info-box-value">{post.severity}</span></div>
            <div className="info-box-row"><span className="info-box-label">Location</span><span className="info-box-value">{post.location?.city}, {post.location?.region}</span></div>
            <div className="info-box-row"><span className="info-box-label">Created</span><span className="info-box-value">{formatDateTime(post.createdAt)}</span></div>
          </div>
          <p style={{ marginTop: 16, fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{post.description}</p>

          {post.status === 'pending' && (
            <div style={{ marginTop: 20 }}>
              <div className="form-group">
                <label className="form-label">Admin Note / Decline Reason</label>
                <textarea className="form-input form-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" onClick={() => handleStatusChange('approved')}>Approve</button>
                <button className="btn btn-danger" onClick={() => handleStatusChange('declined')}>Decline</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Withdrawal Requests</h3>
          {withdrawals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No withdrawal requests for this campaign.</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(w.amount)}</span>
                  <span className={`status-badge status-${w.status === 'completed' ? 'completed' : w.status === 'rejected' ? 'declined' : 'pending'}`}>{w.status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDateTime(w.createdAt)} · {w.method}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="detail-section" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Donations ({donations.length})</h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Donor</th><th>Amount</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d._id}>
                  <td>{d.isAnonymous ? 'Anonymous' : d.donor?.name}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(d.amount)}</td>
                  <td>{d.message || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="detail-section">
        <h3 style={{ marginBottom: 12 }}>Comments ({comments.length})</h3>
        {comments.map((c) => (
          <div key={c._id} className="comment">
            <div className="comment-avatar">{getInitials(c.author?.name || 'U')}</div>
            <div className="comment-body">
              <div className="comment-author">{c.author?.name}</div>
              <p className="comment-text">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPostDetailPage;