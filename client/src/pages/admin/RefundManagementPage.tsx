import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IRefund } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_TABS = ['all', 'pending', 'approved', 'processed', 'rejected'];

const RefundManagementPage: React.FC = () => {
  const [refunds, setRefunds] = useState<IRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { fetchRefunds(); }, [statusFilter]);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/refunds', { params: { status: statusFilter, limit: 50 } });
      setRefunds(data.refunds);
    } catch {
      toast.error('Error fetching refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, status: string) => {
    const adminNotes = status === 'rejected' ? prompt('Reason for rejecting this refund?') || '' : '';
    try {
      await api.put(`/refunds/${id}/status`, { status, adminNotes });
      toast.success(`Refund ${status}`);
      fetchRefunds();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error updating refund');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Refund Requests</h1>
        <p>Review donor refund requests. Processing issues the refund via Paystack.</p>
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
      ) : refunds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No refund requests</h3>
          <p>Nothing to review in this category right now.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Donor</th><th>Campaign</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r._id}>
                  <td>{typeof r.requestedBy === 'object' ? r.requestedBy.name : 'User'}</td>
                  <td>{r.donation?.type === 'platform' ? 'Platform Fund' : (r.donation?.post as any)?.title || 'Post'}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(r.donation?.amount || 0)}</td>
                  <td style={{ maxWidth: 260 }}>{r.reason}</td>
                  <td><span className={`status-badge status-${r.status === 'rejected' ? 'declined' : r.status === 'processed' ? 'completed' : 'pending'}`}>{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleUpdate(r._id, 'approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleUpdate(r._id, 'rejected')}>Reject</button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(r._id, 'processed')}>Process Refund</button>
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

export default RefundManagementPage;