import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IAdminStats } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import {
  HiOutlineUsers, HiOutlineDocumentText, HiOutlineBanknotes,
  HiOutlineClock, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineArrowTrendingUp, HiOutlineGift,
} from 'react-icons/hi2';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<IAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;
  if (!stats) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of the HelpFundMe platform</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>
          <div className="stat-card-header">
            <div className="stat-card-icon blue"><HiOutlineUsers /></div>
          </div>
          <div className="stat-card-value">{stats.users.total}</div>
          <div className="stat-card-label">Total Users</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/posts')}>
          <div className="stat-card-header">
            <div className="stat-card-icon gold"><HiOutlineDocumentText /></div>
          </div>
          <div className="stat-card-value">{stats.posts.total}</div>
          <div className="stat-card-label">Total Posts</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/posts?status=pending')}>
          <div className="stat-card-header">
            <div className="stat-card-icon red"><HiOutlineClock /></div>
          </div>
          <div className="stat-card-value">{stats.posts.pending}</div>
          <div className="stat-card-label">Pending Reviews</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><HiOutlineArrowTrendingUp /></div>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.donations.totalAmount)}</div>
          <div className="stat-card-label">Total Donations</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Post Breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📋 Post Status Breakdown</h3>
          <div className="info-box">
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineCheckCircle style={{ color: '#66BB6A', verticalAlign: 'middle' }} /> Approved</span>
              <span className="info-box-value">{stats.posts.approved}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineClock style={{ color: '#FFA726', verticalAlign: 'middle' }} /> Pending</span>
              <span className="info-box-value">{stats.posts.pending}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineXCircle style={{ color: '#EF5350', verticalAlign: 'middle' }} /> Declined</span>
              <span className="info-box-value">{stats.posts.declined}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineCheckCircle style={{ color: '#42A5F5', verticalAlign: 'middle' }} /> Completed</span>
              <span className="info-box-value">{stats.posts.completed}</span>
            </div>
          </div>
        </div>

        {/* Donation Breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>💰 Donation Breakdown</h3>
          <div className="info-box">
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineBanknotes style={{ color: 'var(--gold)', verticalAlign: 'middle' }} /> Direct to Posts</span>
              <span className="info-box-value">{formatCurrency(stats.donations.postDonations)}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label"><HiOutlineGift style={{ color: 'var(--green-light)', verticalAlign: 'middle' }} /> Platform Fund</span>
              <span className="info-box-value">{formatCurrency(stats.donations.platformDonations)}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label">Transaction Count</span>
              <span className="info-box-value">{stats.donations.count}</span>
            </div>
          </div>
        </div>

        {/* Platform Fund */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>🏦 Platform Fund</h3>
          <div className="info-box">
            <div className="info-box-row">
              <span className="info-box-label">Available Balance</span>
              <span className="info-box-value" style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{formatCurrency(stats.platformFund.balance)}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label">Total Received</span>
              <span className="info-box-value">{formatCurrency(stats.platformFund.totalReceived)}</span>
            </div>
            <div className="info-box-row">
              <span className="info-box-label">Total Allocated</span>
              <span className="info-box-value">{formatCurrency(stats.platformFund.totalAllocated)}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: '16px' }} onClick={() => navigate('/admin/funds')}>
            Allocate Funds
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
