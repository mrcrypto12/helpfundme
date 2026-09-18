import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IPlatformFund, IPost } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlineBanknotes } from 'react-icons/hi2';

const FundAllocationPage: React.FC = () => {
  const [fund, setFund] = useState<IPlatformFund | null>(null);
  const [approvedPosts, setApprovedPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateReason, setAllocateReason] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [fundRes, postsRes] = await Promise.all([
        api.get('/admin/funds'),
        api.get('/admin/posts', { params: { status: 'approved', limit: 100 } }),
      ]);
      setFund(fundRes.data.fund);
      setApprovedPosts(postsRes.data.posts);
    } catch {
      toast.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedPostId || !allocateAmount || !allocateReason) {
      toast.error('Please fill all fields');
      return;
    }
    setAllocating(true);
    try {
      await api.post('/admin/funds/allocate', {
        postId: selectedPostId,
        amount: parseFloat(allocateAmount),
        reason: allocateReason,
      });
      toast.success('Funds allocated successfully!');
      setSelectedPostId('');
      setAllocateAmount('');
      setAllocateReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error allocating funds');
    } finally {
      setAllocating(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fund Allocation</h1>
        <p>Allocate platform fund donations to individuals who need it most</p>
      </div>

      {/* Fund Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon gold"><HiOutlineBanknotes /></div></div>
          <div className="stat-card-value">{formatCurrency(fund?.totalBalance || 0)}</div>
          <div className="stat-card-label">Available Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon green"><HiOutlineBanknotes /></div></div>
          <div className="stat-card-value">{formatCurrency(fund?.totalReceived || 0)}</div>
          <div className="stat-card-label">Total Received</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon blue"><HiOutlineBanknotes /></div></div>
          <div className="stat-card-value">{formatCurrency(fund?.totalAllocated || 0)}</div>
          <div className="stat-card-label">Total Allocated</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Allocate Form */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Allocate Funds to a Post</h3>

          <div className="form-group">
            <label className="form-label">Select Post <span className="required">*</span></label>
            <select
              className="form-input form-select"
              value={selectedPostId}
              onChange={(e) => setSelectedPostId(e.target.value)}
            >
              <option value="">— Select a post —</option>
              {approvedPosts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} ({formatCurrency(p.amountRaised)} / {formatCurrency(p.targetAmount)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (GHS) <span className="required">*</span></label>
            <input
              type="number"
              className="form-input"
              placeholder="Enter amount to allocate"
              value={allocateAmount}
              onChange={(e) => setAllocateAmount(e.target.value)}
              min="1"
            />
            <div className="form-helper">Available: {formatCurrency(fund?.totalBalance || 0)}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason <span className="required">*</span></label>
            <textarea
              className="form-input form-textarea"
              placeholder="Why is this allocation being made?"
              value={allocateReason}
              onChange={(e) => setAllocateReason(e.target.value)}
              rows={3}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleAllocate} disabled={allocating}>
            {allocating ? 'Allocating...' : 'Allocate Funds'}
          </button>
        </div>

        {/* Allocation History */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Allocation History</h3>
          {!fund?.allocations || fund.allocations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No allocations yet.</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {fund.allocations.slice().reverse().map((alloc, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {typeof alloc.post === 'object' ? alloc.post?.title : 'Post'}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{formatCurrency(alloc.amount)}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{alloc.reason}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    by {typeof alloc.allocatedBy === 'object' ? alloc.allocatedBy?.name : 'Admin'} · {formatDateTime(alloc.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundAllocationPage;
