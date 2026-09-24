import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IDonation, IDonationStats, IReceipt } from '../../types';
import { formatCurrency, formatDateTime, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlineHeart, HiOutlineBanknotes, HiOutlineGift, HiOutlineArrowTrendingUp, HiOutlineDocumentText } from 'react-icons/hi2';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReceiptModal from '../../components/ReceiptModal';

const DonationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [myDonations, setMyDonations] = useState<IDonation[]>([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [stats, setStats] = useState<IDonationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('my');
  const [showPlatformDonate, setShowPlatformDonate] = useState(false);
  const [platformAmount, setPlatformAmount] = useState('');
  const [donating, setDonating] = useState(false);

  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<IReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    // Handle payment verification redirect
    const ref = searchParams.get('reference');
    if (ref) {
      verifyPayment(ref);
    }
    fetchData();
  }, []);

  const verifyPayment = async (reference: string) => {
    try {
      const { data } = await api.post(`/donations/verify/${reference}`);
      if (data.donation.paymentStatus === 'success') {
        toast.success('Donation successful! Thank you for your generosity! 🎉');
      } else {
        toast.error('Payment could not be verified');
      }
      // Clean URL
      navigate('/donations', { replace: true });
    } catch {
      toast.error('Payment verification failed');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, statsRes] = await Promise.all([
        api.get('/donations/my'),
        api.get('/donations/stats'),
      ]);
      setMyDonations(myRes.data.donations);
      setTotalDonated(myRes.data.totalDonated);
      setStats(statsRes.data.stats);
    } catch {
      console.error('Error fetching donations');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformDonate = async () => {
    const amount = parseFloat(platformAmount);
    if (!amount || amount < 0.5) { toast.error('Minimum donation is GHS 0.50'); return; }
    setDonating(true);
    try {
      const { data } = await api.post('/donations/initialize', {
        amount, type: 'platform', message: '', isAnonymous: false,
      });
      window.location.href = data.authorization_url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setDonating(false);
    }
  };

  const handleViewReceipt = async (donationId: string) => {
    setShowReceipt(true);
    setReceiptLoading(true);
    setReceiptData(null);
    try {
      const { data } = await api.get(`/donations/${donationId}/receipt`);
      setReceiptData(data.receipt);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error loading receipt');
      setShowReceipt(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h1>Donations</h1>
            <p>Track your giving and see the impact you're making</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPlatformDonate(true)}> Donate to Platform </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon gold"><HiOutlineBanknotes /></div>
          </div>
          <div className="stat-card-value">{formatCurrency(totalDonated)}</div>
          <div className="stat-card-label">Your Total Donations</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><HiOutlineHeart /></div>
          </div>
          <div className="stat-card-value">{myDonations.length}</div>
          <div className="stat-card-label">Donations Made</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon blue"><HiOutlineArrowTrendingUp /></div>
          </div>
          <div className="stat-card-value">{formatCurrency(stats?.totalAmount || 0)}</div>
          <div className="stat-card-label">Platform Total Raised</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon red"><HiOutlineGift /></div>
          </div>
          <div className="stat-card-value">{stats?.uniqueDonors || 0}</div>
          <div className="stat-card-label">Total Donors on Platform</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Donations</button>
        <button className={`tab ${tab === 'platform' ? 'active' : ''}`} onClick={() => setTab('platform')}>Platform Stats</button>
      </div>

      {tab === 'my' && (
        myDonations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <h3>No donations yet</h3>
            <p>When you make your first donation, it will appear here. Start by browsing help posts!</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Browse Posts</button>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {myDonations.map((d) => (
                  <tr key={d._id}>
                    <td
                      style={{ fontWeight: 500, color: 'var(--text-primary)', cursor: d.post ? 'pointer' : 'default' }}
                      onClick={() => d.post && navigate(`/posts/${typeof d.post === 'string' ? d.post : d.post._id}`)}
                    >
                      {d.type === 'platform' ? 'Platform Fund' : (typeof d.post === 'object' && d.post?.title) || 'Help Post'}
                    </td>
                    <td>
                      <span className={`status-badge ${d.type === 'platform' ? 'status-completed' : 'status-approved'}`}>
                        {d.type === 'platform' ? 'Platform' : 'Direct'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{formatCurrency(d.amount)}</td>
                    <td>
                      <span className={`status-badge status-${d.paymentStatus}`}>{d.paymentStatus}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(d.createdAt)}</td>
                    <td>
                      {d.paymentStatus === 'success' ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleViewReceipt(d._id); }}
                        >
                          <HiOutlineDocumentText /> View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'platform' && stats && (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>Platform Impact</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Together, we're making a difference in Ghana</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-light)', fontFamily: 'var(--font-heading)' }}>{formatCurrency(stats.totalAmount)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Raised</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-heading)' }}>{stats.totalDonations}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Donations</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{stats.uniqueDonors}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unique Donors</div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Donate Modal */}
      {showPlatformDonate && (
        <div className="modal-overlay" onClick={() => setShowPlatformDonate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Donate to Platform Fund</h2>
              <button className="modal-close" onClick={() => setShowPlatformDonate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Platform donations go into a general fund that our team allocates to the most urgent cases and individuals who need help the most.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[20, 50, 100, 200, 500, 1000].map((amt) => (
                  <button key={amt} className={`filter-chip ${platformAmount === String(amt) ? 'active' : ''}`} onClick={() => setPlatformAmount(String(amt))}>
                    ₵{amt}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Custom Amount (GHS)</label>
                <input type="number" className="form-input" placeholder="Enter amount" value={platformAmount} onChange={(e) => setPlatformAmount(e.target.value)} min="0.5" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPlatformDonate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePlatformDonate} disabled={donating || !platformAmount}>
                {donating ? 'Processing...' : `Donate ${platformAmount ? formatCurrency(parseFloat(platformAmount)) : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        receipt={receiptData}
        loading={receiptLoading}
      />
    </div>
  );
};

export default DonationsPage;
