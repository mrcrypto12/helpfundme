import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IPost, CATEGORY_LABELS } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const MyPostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal modal state
  const [withdrawPost, setWithdrawPost] = useState<IPost | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'mobile_money'>('mobile_money');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [momoProvider, setMomoProvider] = useState('MTN');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMyPosts(); }, []);

  const fetchMyPosts = async () => {
    try {
      const { data } = await api.get('/posts/my/posts');
      setPosts(data.posts);
    } catch {
      toast.error('Error fetching your posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Error deleting post');
    }
  };

  const resetWithdrawForm = () => {
    setWithdrawPost(null);
    setAmount('');
    setBank(''); setAccountNumber(''); setAccountName('');
    setMomoProvider('MTN'); setMomoPhone(''); setMomoName('');
  };

  const handleRequestWithdrawal = async () => {
    if (!withdrawPost) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (method === 'bank' && (!bank || !accountNumber || !accountName)) {
      toast.error('Fill in all bank details'); return;
    }
    if (method === 'mobile_money' && (!momoPhone || !momoName)) {
      toast.error('Fill in all mobile money details'); return;
    }

    setSubmitting(true);
    try {
      await api.post('/withdrawals', {
        postId: withdrawPost._id,
        amount: amt,
        method,
        bankInfo: method === 'bank' ? { bank, accountNumber, accountName } : undefined,
        mobileMoneyInfo: method === 'mobile_money' ? { provider: momoProvider, phone: momoPhone, name: momoName } : undefined,
      });
      toast.success('Withdrawal request submitted for review');
      resetWithdrawForm();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error requesting withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h1>My Posts</h1>
            <p>Manage your help requests</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/posts/create')}>+ New Post</button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No posts yet</h3>
          <p>Create your first help post and let people know how they can support you.</p>
          <button className="btn btn-primary" onClick={() => navigate('/posts/create')}>Create a Post</button>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Target</th>
                <th>Raised</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const progress = post.targetAmount > 0 ? Math.round((post.amountRaised / post.targetAmount) * 100) : 0;
                const canWithdraw = ['approved', 'completed'].includes(post.status) && post.amountRaised > 0;
                return (
                  <tr key={post._id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/posts/${post._id}`)}>
                      {post.title}
                    </td>
                    <td>{CATEGORY_LABELS[post.category]}</td>
                    <td>{formatCurrency(post.targetAmount)}</td>
                    <td>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(post.amountRaised)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> ({progress}%)</span>
                    </td>
                    <td><span className={`status-badge status-${post.status}`}>{post.status}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(post.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/posts/${post._id}`)}>View</button>
                        {canWithdraw && (
                          <button className="btn btn-primary btn-sm" onClick={() => setWithdrawPost(post)}>Withdraw</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {withdrawPost && (
        <div className="modal-overlay" onClick={resetWithdrawForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💸 Request Withdrawal</h2>
              <button className="modal-close" onClick={resetWithdrawForm}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Withdrawing from: <strong>{withdrawPost.title}</strong> (Available: {formatCurrency(withdrawPost.amountRaised)})
              </p>

              <div className="form-group">
                <label className="form-label">Amount (GHS) <span className="required">*</span></label>
                <input type="number" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" max={withdrawPost.amountRaised} />
              </div>

              <div className="form-group">
                <label className="form-label">Payout Method</label>
                <select className="form-input form-select" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {method === 'mobile_money' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Provider</label>
                    <select className="form-input form-select" value={momoProvider} onChange={(e) => setMomoProvider(e.target.value)}>
                      <option value="MTN">MTN Mobile Money</option>
                      <option value="Vodafone">Telecel Cash</option>
                      <option value="AirtelTigo">AirtelTigo Money</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Money Number</label>
                    <input className="form-input" placeholder="e.g. 024XXXXXXX" value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registered Name</label>
                    <input className="form-input" value={momoName} onChange={(e) => setMomoName(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input className="form-input" value={bank} onChange={(e) => setBank(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input className="form-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Name</label>
                    <input className="form-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={resetWithdrawForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRequestWithdrawal} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPostsPage;