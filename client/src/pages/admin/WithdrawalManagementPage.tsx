import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IWithdrawal } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_TABS = ['all', 'pending', 'approved', 'processing', 'completed', 'rejected'];

const WithdrawalManagementPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<IWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { fetchWithdrawals(); }, [statusFilter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/withdrawals', { params: { status: statusFilter, limit: 50 } });
      setWithdrawals(data.withdrawals);
    } catch {
      toast.error('Error fetching withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, status: string) => {
    const adminNotes = status === 'rejected' ? prompt('Reason for rejecting this withdrawal?') || '' : '';
    try {
      await api.put(`/withdrawals/${id}/status`, { status, adminNotes });
      toast.success(`Withdrawal ${status}`);
      fetchWithdrawals();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error updating withdrawal');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Withdrawal Requests</h1>
        <p>Review and process payout requests from campaign owners</p>
      </div>

      <div className="tabs">
        {STATUS_TABS.map((s) => (
          <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader-container"><div className="loader" /></div>
      ) : withdrawals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No withdrawal requests</h3>
          <p>Nothing to review in this category right now.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Campaign</th><th>Requested By</th><th>Amount</th><th>Method</th><th>Details</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w._id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {typeof w.post === 'object' ? w.post.title : 'Post'}
                  </td>
                  <td>{typeof w.requestedBy === 'object' ? w.requestedBy.name : 'User'}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(w.amount)}</td>
                  <td>{w.method === 'bank' ? 'Bank' : 'Mobile Money'}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {w.method === 'bank'
                      ? `${w.bankInfo?.bank} · ${w.bankInfo?.accountNumber} · ${w.bankInfo?.accountName}`
                      : `${w.mobileMoneyInfo?.provider} · ${w.mobileMoneyInfo?.phone} · ${w.mobileMoneyInfo?.name}`}
                  </td>
                  <td><span className={`status-badge status-${w.status === 'rejected' ? 'declined' : w.status === 'completed' ? 'completed' : 'pending'}`}>{w.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {w.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleUpdate(w._id, 'approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleUpdate(w._id, 'rejected')}>Reject</button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(w._id, 'processing')}>Mark Processing</button>
                      )}
                      {w.status === 'processing' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleUpdate(w._id, 'completed')}>Mark Completed</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WithdrawalManagementPage;