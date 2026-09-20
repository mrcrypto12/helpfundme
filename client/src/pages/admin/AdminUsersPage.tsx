import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IUser } from '../../types';
import { formatCurrency, formatDateTime, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchUsers(); }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { page, limit: 20 } });
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerify = async (userId: string) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/verify`, { field: 'identity' });
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
      toast.success('Verification updated');
    } catch {
      toast.error('Error updating verification');
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Users</h1>
        <p>Manage registered users on the platform</p>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Total Donated</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                      {u.avatar ? <img src={u.avatar} alt={u.name} /> : getInitials(u.name)}
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td><span className={`status-badge ${u.role === 'admin' ? 'status-approved' : 'status-pending'}`}>{u.role}</span></td>
                <td>
                  {u.verification?.identity ? (
                    <span className="status-badge status-completed">✓ Verified</span>
                  ) : (
                    <span className="status-badge status-pending">Unverified</span>
                  )}
                </td>
                <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(u.totalDonated)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(u.createdAt)}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/users/${u._id}`)}>
                    Review Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
