import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { getInitials } from '../../utils/helpers';
import { BADGE_META } from '../../utils/badges';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });
  const [verificationData, setVerificationData] = useState({ legalName: user?.verification?.legalName || '', dateOfBirth: user?.verification?.dateOfBirth || '', idType: user?.verification?.idType || 'ghana_card', idNumber: user?.verification?.idNumber || '', phone: user?.phone || '' });
  const [documents, setDocuments] = useState<File[]>([]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', formData);
      updateUser(data.user);
      toast.success('Profile updated');
      setEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const badges = user?.badges || [];
  const verified = user?.verification?.identity;

  const submitVerification = async () => {
    const fd = new FormData();
    Object.entries(verificationData).forEach(([key, value]) => fd.append(key, value));
    documents.forEach((file) => fd.append('documents', file));
    try { const { data } = await api.post('/auth/verification', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); updateUser(data.user); toast.success(data.message); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Verification submission failed'); }
  };

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <div className="user-avatar" style={{ width: 80, height: 80, fontSize: '1.5rem', margin: '0 auto 16px' }}>
          {user?.avatar ? <img src={user.avatar} alt={user.name} /> : getInitials(user?.name || 'U')}
        </div>
        <h1>{user?.name}</h1>
        <p>{user?.email}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {user?.role === 'admin' && <span className="status-badge status-approved">Admin</span>}
          {verified && <span className="status-badge status-completed">✓ Verified</span>}
        </div>
      </div>

      {badges.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Badges Earned</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {badges.map((b) => {
              const meta = BADGE_META[b];
              if (!meta) return null;
              return (
                <div
                  key={b}
                  title={meta.description}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', minWidth: 90,
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Profile Information</h3>
          {!editing && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
        </div>

        {editing ? (
          <>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input form-textarea" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+233..." />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Region" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="info-box">
            <div className="info-box-row"><span className="info-box-label">Name</span><span className="info-box-value">{user?.name}</span></div>
            <div className="info-box-row"><span className="info-box-label">Email</span><span className="info-box-value">{user?.email}</span></div>
            <div className="info-box-row"><span className="info-box-label">Bio</span><span className="info-box-value">{user?.bio || 'Not set'}</span></div>
            <div className="info-box-row"><span className="info-box-label">Phone</span><span className="info-box-value">{user?.phone || 'Not set'}</span></div>
            <div className="info-box-row"><span className="info-box-label">Location</span><span className="info-box-value">{user?.location || 'Not set'}</span></div>
            <div className="info-box-row"><span className="info-box-label">Campaigns Supported</span><span className="info-box-value">{user?.campaignsSupported || 0}</span></div>
            <div className="info-box-row"><span className="info-box-label">Member since</span><span className="info-box-value">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span></div>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3>Identity verification</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px' }}>Required before campaign approval. Documents remain private and are available only to authorized reviewers.</p>
        <div className="form-group"><label className="form-label">Full legal name</label><input className="form-input" value={verificationData.legalName} onChange={(e) => setVerificationData({ ...verificationData, legalName: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Date of birth</label><input type="date" className="form-input" value={verificationData.dateOfBirth} onChange={(e) => setVerificationData({ ...verificationData, dateOfBirth: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">ID type</label><select className="form-input" value={verificationData.idType} onChange={(e) => setVerificationData({ ...verificationData, idType: e.target.value })}><option value="ghana_card">Ghana Card</option><option value="passport">Passport</option><option value="drivers_licence">Driver's licence</option><option value="other">Other lawful ID</option></select></div>
        <div className="form-group"><label className="form-label">ID number</label><input className="form-input" value={verificationData.idNumber} onChange={(e) => setVerificationData({ ...verificationData, idNumber: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={verificationData.phone} onChange={(e) => setVerificationData({ ...verificationData, phone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">ID documents (PDF/JPG/PNG, max 10MB)</label><input type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => setDocuments(Array.from(e.target.files || []))} /></div>
        <button className="btn btn-primary" onClick={submitVerification}>Submit for verification</button>
        <p style={{ marginTop: 10, color: 'var(--text-muted)' }}>Status: {user?.verification?.status || 'not_submitted'}</p>
      </div>
    </div>
  );
};

export default ProfilePage;
