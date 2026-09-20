import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IPost } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PostManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPost, setSelectedPost] = useState<IPost | null>(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => { fetchPosts(); }, [statusFilter, page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/admin/posts', { params });
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
    } catch {
      toast.error('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (postId: string, status: string) => {
    try {
      await api.put(`/admin/posts/${postId}/status`, {
        status,
        adminNotes: actionNote,
        declineReason: status === 'declined' ? actionNote : undefined,
      });
      toast.success(`Post ${status}`);
      setSelectedPost(null);
      setActionNote('');
      fetchPosts();
    } catch {
      toast.error('Error updating post');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Post Management</h1>
        <p>Review, approve, or decline help posts</p>
      </div>

      <div className="tabs">
        {['all', 'pending', 'approved', 'declined', 'completed'].map((s) => (
          <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader-container"><div className="loader" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No posts found</h3>
          <p>There are no posts with this status.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>Target</th>
                <th>Raised</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} onClick={() => navigate(`/admin/posts/${post._id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title}
                  </td>
                  <td>{post.author?.name || 'N/A'}</td>
                  <td>{post.category}</td>
                  <td>{formatCurrency(post.targetAmount)}</td>
                  <td style={{ color: 'var(--gold)' }}>{formatCurrency(post.amountRaised)}</td>
                  <td>
                    <span className={`status-badge status-${post.status}`}>{post.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(post.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={(event) => { event.stopPropagation(); navigate(`/admin/posts/${post._id}`); }}>
                        Review Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
        </div>
      )}

      {/* Decline Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Decline Post</h2>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Declining: <strong>{selectedPost.title}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Reason for declining</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Explain why this post was declined..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPost(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleStatusChange(selectedPost._id, 'declined')}>
                Decline Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostManagementPage;
