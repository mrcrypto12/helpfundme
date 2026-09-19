import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IRegionStat } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineMapPin } from 'react-icons/hi2';

const MapView: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<IRegionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/posts/stats/regions');
      setStats(data.stats);
    } catch {
      console.error('Error fetching region stats');
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Location base</h1>
        <p>See where help is being requested across the country. Tap a region to browse its campaigns.</p>
      </div>

      {stats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No regional data yet</h3>
          <p>Once campaigns are approved, they'll show up here grouped by region.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {stats.map((s) => {
            const intensity = s.count / maxCount;
            return (
              <div
                key={s.region}
                className="card"
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  borderColor: intensity > 0.6 ? 'var(--primary)' : 'var(--border)',
                  background: `linear-gradient(135deg, rgba(27,138,42,${0.04 + intensity * 0.12}) 0%, var(--bg-card) 100%)`,
                }}
                onClick={() => navigate(`/dashboard?region=${encodeURIComponent(s.region)}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <HiOutlineMapPin style={{ color: 'var(--primary-light)' }} />
                  <h3 style={{ fontSize: '1rem' }}>{s.region}</h3>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary-light)' }}>
                  {s.count}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  active campaign{s.count === 1 ? '' : 's'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600 }}>
                  {formatCurrency(s.totalRaised)} raised
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapView;