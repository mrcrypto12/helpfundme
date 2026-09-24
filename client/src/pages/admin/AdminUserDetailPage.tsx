import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { API_URL } from '../../services/api';
import { IPost, IUser } from '../../types';
import { formatDateTime } from '../../utils/helpers';

const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<IUser | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [note, setNote] = useState('');

  const load = async () => {
    const { data } = await api.get(`/admin/users/${id}`);
    setUser(data.user); setPosts(data.posts);
  };
  useEffect(() => { load().catch(() => toast.error('Unable to load user')); }, [id]);

  const toggle = async (field: 'identity' | 'documents' | 'phone') => {
    const { data } = await api.put(`/admin/users/${id}/verify`, { field, adminNotes: note });
    setUser(data.user); toast.success('Verification decision recorded');
  };

  const toggleAccount = async () => {
    if (!confirm(`${user?.accountStatus === 'deactivated' ? 'Activate' : 'Deactivate'} this account?`)) return;
    const { data } = await api.put(`/admin/users/${id}/account-status`, { note }); setUser(data.user); toast.success(data.message);
  };

  if (!user) return <div className="loader-container"><div className="loader" /></div>;
  const verification = user.verification || { identity: false, documents: false, phone: false };
  return <div className="page-container">
    <button className="btn btn-ghost" onClick={() => navigate('/admin/users')}>← Back to Users</button>
    <div className="page-header"><h1>{user.name}</h1><p>{user.email} · joined {formatDateTime(user.createdAt)}</p></div>
    <div className="card" style={{ padding: 18, marginBottom: 20, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div><strong>Account status: {user.accountStatus || 'active'}</strong><p style={{ color: 'var(--text-muted)' }}>Deactivation hides campaigns and blocks login without deleting retained records.</p></div><button className={user.accountStatus === 'deactivated' ? 'btn btn-success' : 'btn btn-danger'} onClick={toggleAccount}>{user.accountStatus === 'deactivated' ? 'Activate account' : 'Deactivate account'}</button></div>
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      <h3>Identity details</h3>
      <div className="info-box" style={{ marginTop: 12 }}>
        <div className="info-box-row"><span className="info-box-label">Legal name</span><span>{verification.legalName || 'Not supplied'}</span></div>
        <div className="info-box-row"><span className="info-box-label">Date of birth</span><span>{verification.dateOfBirth || 'Not supplied'}</span></div>
        <div className="info-box-row"><span className="info-box-label">ID type</span><span>{verification.idType || 'Not supplied'}</span></div>
        <div className="info-box-row"><span className="info-box-label">ID number</span><span>{verification.idNumber || 'Not supplied'}</span></div>
        <div className="info-box-row"><span className="info-box-label">Phone</span><span>{user.phone || 'Not supplied'}</span></div>
        <div className="info-box-row"><span className="info-box-label">Email verification</span><span>{user.emailVerified ? 'Verified by OTP / provider' : 'Not verified'}</span></div>
        <div className="info-box-row"><span className="info-box-label">Status</span><span>{verification.status || 'not_submitted'}</span></div>
      </div>
      <h4 style={{ marginTop: 18 }}>Private verification documents</h4>
      {(verification.documentsList || []).length === 0 ? <p>No documents uploaded.</p> : (verification.documentsList || []).map((doc, index) =>
        <span key={index} style={{ display: 'inline-flex', gap: 6, margin: '8px 8px 0 0' }}><a className="btn btn-secondary btn-sm" href={`${API_URL}/admin/users/${id}/documents/${index}`} target="_blank" rel="noreferrer">View {doc.originalName}</a><a className="btn btn-ghost btn-sm" href={`${API_URL}/admin/users/${id}/documents/${index}?download=1`}>Download</a></span>
      )}
      <div className="form-group" style={{ marginTop: 18 }}><label className="form-label">Decision notes</label><textarea className="form-input form-textarea" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-success" onClick={() => toggle('identity')}>{verification.identity ? 'Revoke identity' : 'Approve identity'}</button>
        <button className="btn btn-success" onClick={() => toggle('documents')}>{verification.documents ? 'Revoke documents' : 'Approve documents'}</button>
        <button className="btn btn-secondary" onClick={() => toggle('phone')}>{verification.phone ? 'Revoke phone' : 'Mark phone checked'}</button>
      </div>
    </div>
    <div className="card" style={{ padding: 24 }}><h3>Campaigns ({posts.length})</h3>{posts.map((post) => <button key={post._id} className="btn btn-ghost btn-block" onClick={() => navigate(`/admin/posts/${post._id}`)}>{post.title} — {post.status}</button>)}</div>
  </div>;
};
export default AdminUserDetailPage;
