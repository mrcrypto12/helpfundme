import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { IPost, CATEGORY_LABELS, GHANA_REGIONS } from '../../types';
import { formatCurrency, timeAgo } from '../../utils/helpers';
import { HiOutlineMapPin, HiOutlineEye, HiOutlineHeart, HiOutlineUsers } from 'react-icons/hi2';
import SensitiveImage from '../../components/SensitiveImage';

const QUICK_FILTERS = [
  { label: 'Nearing Goal', sort: 'almost-funded', severity: 'all' },
  { label: 'Recently Created', sort: 'newest', severity: 'all' },
  { label: 'Most Popular', sort: 'popular', severity: 'all' },
  { label: 'Critical', sort: 'newest', severity: 'critical' },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeRegion, setActiveRegion] = useState(searchParams.get('region') || 'all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];

  useEffect(() => {
    fetchPosts();
  }, [page, activeCategory, activeSeverity, activeRegion, sortBy, searchParams]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12, sort: sortBy };
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeSeverity !== 'all') params.severity = activeSeverity;
      if (activeRegion !== 'all') params.region = activeRegion;
      const search = searchParams.get('search');
      if (search) params.search = search;

      const { data } = await api.get('/posts', { params });
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyQuickFilter = (qf: typeof QUICK_FILTERS[number]) => {
    setSortBy(qf.sort);
    setActiveSeverity(qf.severity);
    setPage(1);
  };

  const clearRegion = () => {
    setActiveRegion('all');
    searchParams.delete('region');
    setSearchParams(searchParams);
  };

  const renderPostCard = (post: IPost) => {
    const progress = post.targetAmount > 0 ? Math.min(100, Math.round((post.amountRaised / post.targetAmount) * 100)) : 0;
    const remaining = Math.max(0, post.targetAmount - post.amountRaised);

    return (
      <div key={post._id} className="post-card" onClick={() => navigate(`/posts/${post._id}`)}>
        {post.images?.[0] ? (
          <SensitiveImage src={post.images[0]} alt={post.title} className="post-card-image" />
        ) : (
          <div className="post-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
            No image uploads
          </div>
        )}
        <div className="post-card-body">
          <div className="post-card-header">
            <span className="post-card-category">{CATEGORY_LABELS[post.category] || post.category}</span>
            <span className={`severity-badge severity-${post.severity}`}>
              {post.severity}
            </span>
          </div>
          <h3 className="post-card-title">{post.title}</h3>
          <p className="post-card-desc">{post.description}</p>
          <div className="post-card-location">
            <HiOutlineMapPin /> {post.location?.city}, {post.location?.region}
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-header">
              <span className="progress-amount">{formatCurrency(post.amountRaised)}</span>
              <span className="progress-percentage">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${progress >= 100 ? 'completed' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span className="progress-target">of {formatCurrency(post.targetAmount)}</span>
              <span className="progress-target">{timeAgo(post.createdAt)}</span>
            </div>
            {progress < 100 && remaining > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '6px', fontWeight: 500 }}>
                {formatCurrency(remaining)} to go
              </div>
            )}
          </div>

          <div className="post-card-footer">
            <div className="post-card-stats">
              <span className="post-stat"><HiOutlineUsers className="icon" /> {post.donorsCount}</span>
              <span className="post-stat"><HiOutlineHeart className="icon" /> {post.likesCount}</span>
              <span className="post-stat"><HiOutlineEye className="icon" /> {post.viewCount}</span>
            </div>
            <button className="post-card-donate-btn" onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post._id}`); }}>
              Donate
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h1>Help Someone Today</h1>
            <p>Browse and support people in need across Ghana</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/posts/create')}>
            + Create Post
          </button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="quick-filters-row">
        {QUICK_FILTERS.map((qf) => (
          <button
            key={qf.label}
            className={`filter-chip ${sortBy === qf.sort && activeSeverity === qf.severity ? 'active' : ''}`}
            onClick={() => applyQuickFilter(qf)}
          >
            {qf.label}
          </button>
        ))}
        {activeRegion !== 'all' && (
          <button className="filter-chip active" onClick={clearRegion}>
            📍 {activeRegion} ✕
          </button>
        )}
      </div>

      <div className="filters-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat); setPage(1); }}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            value={activeRegion}
            onChange={(e) => { setActiveRegion(e.target.value); setPage(1); }}
            style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All Regions</option>
            {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            className="form-input form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          >
            <option value="newest">Newest</option>
            <option value="urgent">Most Urgent</option>
            <option value="popular">Most Popular</option>
            <option value="almost-funded">Almost Funded</option>
          </select>
          <select
            className="form-input form-select"
            value={activeSeverity}
            onChange={(e) => { setActiveSeverity(e.target.value); setPage(1); }}
            style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="posts-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No posts found</h3>
          <p>There are no help posts matching your filters. Try adjusting your search or be the first to create one!</p>
          <button className="btn btn-primary" onClick={() => navigate('/posts/create')}>Create a Post</button>
        </div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map(renderPostCard)}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
