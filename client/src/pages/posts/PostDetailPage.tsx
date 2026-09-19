import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { IPost, IComment, IDonation, ICampaignUpdate, IHelpOffer, CATEGORY_LABELS } from '../../types';
import { formatCurrency, formatDateTime, timeAgo, getInitials, getSeverityLabel } from '../../utils/helpers';
import ShareModal from '../../components/ShareModal';
import CampaignTimeline from '../../components/CampaignTimeline';
import toast from 'react-hot-toast';
import {
  HiOutlineHeart, HiHeart, HiOutlineChatBubbleLeft,
  HiOutlineShare, HiOutlineEye, HiOutlineMapPin,
  HiOutlineUsers, HiOutlineArrowLeft, HiOutlineLink,
  HiOutlineMegaphone, HiOutlineGift, HiOutlineUserPlus,
  HiOutlineHandRaised, HiOutlineCalendarDays,
} from 'react-icons/hi2';

const HELP_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'share', label: 'Share the campaign', icon: '📢' },
  { value: 'items', label: 'Donate items/supplies', icon: '📦' },
  { value: 'transport', label: 'Offer transport', icon: '🚗' },
  { value: 'professional', label: 'Professional help', icon: '💼' },
  { value: 'prayer', label: 'Prayers & encouragement', icon: '🙏' },
];

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [post, setPost] = useState<IPost | null>(null);
  const [comments, setComments] = useState<IComment[]>([]);
  const [donations, setDonations] = useState<IDonation[]>([]);
  const [updates, setUpdates] = useState<ICampaignUpdate[]>([]);
  const [helpOffers, setHelpOffers] = useState<IHelpOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [donating, setDonating] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [showThankModal, setShowThankModal] = useState(false);
  const [thankMessage, setThankMessage] = useState('');
  const [sendingThank, setSendingThank] = useState(false);

  // Co-organizers
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'sharer'>('sharer');
  const [inviting, setInviting] = useState(false);

  // Help offers
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpType, setHelpType] = useState('share');
  const [helpMessage, setHelpMessage] = useState('');
  const [offeringHelp, setOfferingHelp] = useState(false);

  useEffect(() => {
    if (id) {
      const ref = searchParams.get('reference');
      if (ref) {
        verifyPayment(ref);
      } else {
        fetchPostData();
      }
    }
  }, [id]);

  const verifyPayment = async (reference: string) => {
    try {
      const { data } = await api.post(`/donations/verify/${reference}`);
      if (data.donation.paymentStatus === 'success') {
        toast.success('🎉 Donation successful! Thank you for your generosity!');
      } else {
        toast.error('Payment could not be verified');
      }
      navigate(`/posts/${id}`, { replace: true });
    } catch {
      toast.error('Payment verification failed');
      navigate(`/posts/${id}`, { replace: true });
    }
    fetchPostData();
  };

  const fetchPostData = async () => {
    setLoading(true);
    try {
      const [postRes, commentsRes, donationsRes, updatesRes] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`),
        api.get(`/donations/post/${id}`),
        api.get(`/posts/${id}/updates`),
      ]);
      setPost(postRes.data.post);
      setComments(commentsRes.data.comments);
      setDonations(donationsRes.data.donations);
      setUpdates(updatesRes.data.updates);

      // Owner-only: load help offers received
      if (user && postRes.data.post.author?._id === user._id) {
        try {
          const offersRes = await api.get(`/posts/${id}/help-offers`);
          setHelpOffers(offersRes.data.offers);
        } catch { /* not owner or none */ }
      }
    } catch {
      toast.error('Post not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await api.post(`/posts/${id}/like`);
      setPost((prev) => prev ? { ...prev, likesCount: data.likesCount, likes: data.isLiked ? [...prev.likes, user._id] : prev.likes.filter((l) => l !== user._id) } : null);
    } catch {
      toast.error('Error');
    }
  };

  const handleComment = async () => {
    if (!user) { navigate('/login'); return; }
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content: commentText });
      setComments((prev) => [data.comment, ...prev]);
      setCommentText('');
      setPost((prev) => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      toast.success('Comment added');
    } catch {
      toast.error('Error adding comment');
    }
  };

  const handleDonate = async () => {
    if (!user) { navigate('/login'); return; }
    const amount = parseFloat(donationAmount);
    if (!amount || amount < 0.5) { toast.error('Minimum donation is GHS 0.50'); return; }
    setDonating(true);
    try {
      if (makeRecurring) {
        const { data } = await api.post('/recurring-donations/initialize', {
          amount, type: 'post', postId: id, frequency: recurringFrequency,
        });
        window.location.href = data.authorization_url;
      } else {
        const { data } = await api.post('/donations/initialize', {
          amount, type: 'post', postId: id,
          message: donationMessage, isAnonymous,
        });
        window.location.href = data.authorization_url;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment initialization failed');
    } finally {
      setDonating(false);
    }
  };

  const handleShare = () => setShowShareModal(true);

  const handlePostUpdate = async () => {
    if (!updateContent.trim()) { toast.error('Write something for your update'); return; }
    setPostingUpdate(true);
    try {
      const { data } = await api.post(`/posts/${id}/updates`, { content: updateContent, type: 'update' });
      setUpdates((prev) => [data.update, ...prev]);
      setUpdateContent('');
      setShowUpdateForm(false);
      toast.success('Update posted! Your donors have been notified.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error posting update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleThankDonors = async () => {
    if (!thankMessage.trim()) { toast.error('Write a thank-you message first'); return; }
    setSendingThank(true);
    try {
      const { data } = await api.post(`/posts/${id}/thank-donors`, { message: thankMessage });
      setUpdates((prev) => [data.update, ...prev]);
      toast.success(`Thank-you sent to ${data.donorCount} donor(s)! 💚`);
      setShowThankModal(false);
      setThankMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error sending thank-you');
    } finally {
      setSendingThank(false);
    }
  };

  const handleInviteCoOrganizer = async () => {
    if (!inviteEmail.trim()) { toast.error('Enter an email address'); return; }
    setInviting(true);
    try {
      const { data } = await api.post(`/posts/${id}/co-organizers`, { email: inviteEmail, role: inviteRole });
      setPost(data.post);
      toast.success('Invitation sent');
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error sending invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRespondInvite = async (accept: boolean) => {
    try {
      const { data } = await api.put(`/posts/${id}/co-organizers/respond`, { accept });
      setPost(data.post);
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined');
    } catch {
      toast.error('Error responding to invitation');
    }
  };

  const handleOfferHelp = async () => {
    if (!user) { navigate('/login'); return; }
    setOfferingHelp(true);
    try {
      await api.post(`/posts/${id}/help-offers`, { type: helpType, message: helpMessage });
      toast.success('Your offer to help has been sent to the campaign owner! 💚');
      setShowHelpModal(false);
      setHelpMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error submitting offer');
    } finally {
      setOfferingHelp(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loader-container"><div className="loader" /></div></div>;
  if (!post) return null;

  const progress = post.targetAmount > 0 ? Math.min(100, Math.round((post.amountRaised / post.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, post.targetAmount - post.amountRaised);
  const isLiked = user ? post.likes?.includes(user._id) : false;
  const isCompleted = post.amountRaised >= post.targetAmount;
  const isOwner = user?._id === post.author?._id;
  const myInvite = user ? post.coOrganizers.find((co) => (typeof co.user === 'object' ? co.user._id : co.user) === user._id) : undefined;
  const acceptedCoOrganizers = post.coOrganizers.filter((co) => co.inviteStatus === 'accepted');

  return (
    <div className="page-container">
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>
        <HiOutlineArrowLeft /> Back
      </button>

      {/* Pending co-organizer invite banner */}
      {myInvite && myInvite.inviteStatus === 'pending' && (
        <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--gold)' }}>
          <p style={{ marginBottom: 10, fontSize: '0.9rem' }}>
            🤝 {post.author?.name} invited you to help manage this campaign as a <strong>{myInvite.role}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success btn-sm" onClick={() => handleRespondInvite(true)}>Accept</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleRespondInvite(false)}>Decline</button>
          </div>
        </div>
      )}

      <div className="post-detail">
        {post.images && post.images.length > 0 && (
          <div className="post-detail-images">
            <img src={post.images[activeImage]} alt={post.title} />
            {post.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                {post.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    style={{
                      width: 60, height: 60, borderRadius: '8px', objectFit: 'cover',
                      cursor: 'pointer', border: i === activeImage ? '2px solid var(--primary)' : '2px solid transparent',
                      opacity: i === activeImage ? 1 : 0.6,
                    }}
                    onClick={() => setActiveImage(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="post-detail-header">
          <div className="post-detail-meta">
            <span className="post-card-category">{CATEGORY_LABELS[post.category]}</span>
            <span className={`severity-badge severity-${post.severity}`}>{getSeverityLabel(post.severity)}</span>
            {post.isSurgery && <span className="severity-badge severity-critical">🏥 Surgery Required</span>}
          </div>
          <h1 className="post-detail-title">{post.title}</h1>
          <div className="post-detail-author">
            <div className="avatar">
              {post.author?.avatar ? <img src={post.author.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(post.author?.name || 'U')}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{post.author?.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <HiOutlineMapPin style={{ verticalAlign: 'middle' }} /> {post.location?.city}, {post.location?.region} · {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>
          {post.beneficiary?.name && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Raised on behalf of <strong>{post.beneficiary.name}</strong> ({post.beneficiary.relationship})
              {post.beneficiary.verified && <span style={{ color: 'var(--primary-light)' }}> · ✓ Verified</span>}
            </div>
          )}
        </div>

        <div className="post-actions-bar">
          <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
            {isLiked ? <HiHeart /> : <HiOutlineHeart />} {post.likesCount}
          </button>
          <button className="action-btn">
            <HiOutlineChatBubbleLeft /> {post.commentsCount}
          </button>
          <button className="action-btn" onClick={handleShare}>
            <HiOutlineShare /> Share
          </button>
          <button className="action-btn" onClick={handleShare}>
            <HiOutlineLink /> Copy Link
          </button>
          <button className="action-btn" onClick={() => setShowHelpModal(true)}>
            <HiOutlineHandRaised /> Offer Non-Cash Help
          </button>
          {isOwner && (
            <>
              <button className="action-btn" onClick={() => setShowUpdateForm((v) => !v)}>
                <HiOutlineMegaphone /> Post Update
              </button>
              {donations.length > 0 && (
                <button className="action-btn" onClick={() => setShowThankModal(true)}>
                  <HiOutlineGift /> Thank Donors
                </button>
              )}
              <button className="action-btn" onClick={() => setShowInviteForm((v) => !v)}>
                <HiOutlineUserPlus /> Invite Co-organizer
              </button>
            </>
          )}
          <span className="action-btn" style={{ marginLeft: 'auto', cursor: 'default' }}>
            <HiOutlineEye /> {post.viewCount} views
          </span>
        </div>

        {isOwner && showUpdateForm && (
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <textarea
              className="form-input form-textarea"
              placeholder="Share progress with everyone who's supporting you..."
              value={updateContent}
              onChange={(e) => setUpdateContent(e.target.value)}
              rows={3}
              maxLength={3000}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowUpdateForm(false); setUpdateContent(''); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handlePostUpdate} disabled={postingUpdate}>
                {postingUpdate ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </div>
        )}

        {isOwner && showInviteForm && (
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="Co-organizer's email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ flex: 2, minWidth: 200 }}
              />
              <select className="form-input form-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} style={{ flex: 1, minWidth: 140 }}>
                <option value="sharer">Sharer</option>
                <option value="editor">Editor</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleInviteCoOrganizer} disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
            {acceptedCoOrganizers.length > 0 && (
              <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Current co-organizers: {acceptedCoOrganizers.map((co) => (typeof co.user === 'object' ? co.user.name : 'User')).join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="post-detail-content">
          <div className="post-detail-main">
            <div className="detail-section">
              <h3>Description</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{post.description}</p>
            </div>

            <div className="detail-section">
              <h3>Purpose</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{post.purpose}</p>
            </div>

            {post.isSurgery && post.surgeryDetails && (
              <div className="detail-section">
                <h3>Surgery Details</h3>
                <div className="info-box">
                  <div className="info-box-row">
                    <span className="info-box-label">Hospital</span>
                    <span className="info-box-value">{post.surgeryDetails.hospital || 'N/A'}</span>
                  </div>
                  <div className="info-box-row">
                    <span className="info-box-label">Duration</span>
                    <span className="info-box-value">{post.surgeryDetails.duration || 'N/A'}</span>
                  </div>
                  <div className="info-box-row">
                    <span className="info-box-label">Number of Sessions</span>
                    <span className="info-box-value">{post.surgeryDetails.sessions || 'N/A'}</span>
                  </div>
                  {post.surgeryDetails.description && (
                    <div className="info-box-row" style={{ flexDirection: 'column', gap: '4px' }}>
                      <span className="info-box-label">Additional Details</span>
                      <span className="info-box-value" style={{ fontWeight: 400 }}>{post.surgeryDetails.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {post.fundBreakdown && post.fundBreakdown.length > 0 && (
              <div className="detail-section">
                <h3> Where Your Money Goes</h3>
                <div className="info-box">
                  {post.fundBreakdown.map((item, i) => {
                    const pct = post.targetAmount > 0 ? Math.round((item.amount / post.targetAmount) * 100) : 0;
                    return (
                      <div key={i} className="info-box-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="info-box-label">{item.label}</span>
                          <span className="info-box-value">{formatCurrency(item.amount)} ({pct}%)</span>
                        </div>
                        <div className="progress-bar" style={{ height: 5 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isOwner && helpOffers.length > 0 && (
              <div className="detail-section">
                <h3>🙋 Offers to Help</h3>
                {helpOffers.map((offer) => {
                  const meta = HELP_TYPES.find((h) => h.value === offer.type);
                  return (
                    <div key={offer._id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '1.2rem' }}>{meta?.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{offer.user?.name} — {meta?.label}</div>
                        {offer.message && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{offer.message}</div>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(offer.createdAt)}</div>
                      </div>
                      <span className={`status-badge ${offer.status === 'completed' ? 'status-completed' : 'status-pending'}`}>{offer.status}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="detail-section">
              <h3>Campaign Story</h3>
              <CampaignTimeline updates={updates} />
            </div>

            <div className="comments-section">
              <h3 style={{ marginBottom: '16px' }}>Comments ({post.commentsCount})</h3>
              {user && (
                <div className="comment-input-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Write a supportive comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleComment}>Post</button>
                </div>
              )}
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments yet. Be the first to show support!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="comment">
                    <div className="comment-avatar">{getInitials(comment.author?.name || 'U')}</div>
                    <div className="comment-body">
                      <div className="comment-author">
                        {comment.author?.name}
                        <span className="comment-time">{timeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="post-detail-sidebar">
            <div className="donation-card">
              <div className="amount-raised">{formatCurrency(post.amountRaised)}</div>
              <div className="amount-target">raised of {formatCurrency(post.targetAmount)} goal</div>

              <div className="progress-bar-container" style={{ margin: '16px 0' }}>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isCompleted ? 'var(--gold)' : 'var(--primary-light)' }}>{progress}%</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}><HiOutlineUsers style={{ verticalAlign: 'middle' }} /> {post.donorsCount} donors</span>
                </div>

                {!isCompleted && remaining > 0 && (
                  <div className="gap-display">
                    {formatCurrency(remaining)} needed to complete this goal
                  </div>
                )}
                {isCompleted && (
                  <div className="gap-display" style={{ background: 'rgba(212, 168, 67, 0.1)', color: 'var(--gold)' }}>
                    🎉 Goal reached! Thank you to all donors!
                  </div>
                )}
              </div>

              {!isCompleted && (
                <button className="btn btn-primary btn-block btn-lg" onClick={() => setShowDonateModal(true)} style={{ marginBottom: '12px' }}>
                  Donate Now
                </button>
              )}
              <button className="btn btn-outline btn-block" onClick={handleShare}>
                Share this cause
              </button>

              {donations.length > 0 && (
                <div className="donors-list">
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Recent Donors</h4>
                  {donations.slice(0, 5).map((d) => (
                    <div key={d._id} className="donor-item">
                      <div className="donor-avatar">{getInitials(d.donor?.name || 'A')}</div>
                      <div>
                        <div className="donor-name">{d.donor?.name || 'Anonymous'}</div>
                        <div className="donor-time">{timeAgo(d.createdAt)}</div>
                      </div>
                      <div className="donor-amount">{formatCurrency(d.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Donate Modal */}
      {showDonateModal && (
        <div className="modal-overlay" onClick={() => setShowDonateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Make a Donation</h2>
              <button className="modal-close" onClick={() => setShowDonateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Donating to: <strong>{post.title}</strong>
              </p>

              {remaining > 0 && remaining <= 500 && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--primary-light)' }}>
                  Only {formatCurrency(remaining)} left to reach the goal!
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[10, 20, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    className={`filter-chip ${donationAmount === String(amt) ? 'active' : ''}`}
                    onClick={() => setDonationAmount(String(amt))}
                  >
                    ₵{amt}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Custom Amount (GHS)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  min="0.5"
                  step="0.5"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={makeRecurring}
                  onChange={(e) => setMakeRecurring(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <HiOutlineCalendarDays /> Make this a recurring donation
              </label>

              {makeRecurring ? (
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-input form-select" value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value as any)}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Message (optional)</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Send an encouraging message..."
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      rows={3}
                      style={{ minHeight: '80px' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Donate anonymously
                  </label>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDonateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDonate} disabled={donating || !donationAmount}>
                {donating ? 'Processing...' : `Donate ${donationAmount ? formatCurrency(parseFloat(donationAmount)) : ''}${makeRecurring ? ` / ${recurringFrequency === 'monthly' ? 'mo' : 'wk'}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank Donors Modal */}
      {showThankModal && (
        <div className="modal-overlay" onClick={() => setShowThankModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🙏 Thank Your Donors</h2>
              <button className="modal-close" onClick={() => setShowThankModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                This message will be sent as a notification to everyone who has donated to "{post.title}", and added to your campaign story.
              </p>
              <div className="form-group">
                <label className="form-label">Your Message</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Thank you so much for your kindness and support..."
                  value={thankMessage}
                  onChange={(e) => setThankMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowThankModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleThankDonors} disabled={sendingThank}>
                {sendingThank ? 'Sending...' : 'Send Thank-You'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Non-Cash Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🙋 Offer to Help</h2>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Not everyone can give money — you can still make a difference.
              </p>
              <div className="form-group">
                <label className="form-label">How would you like to help?</label>
                <select className="form-input form-select" value={helpType} onChange={(e) => setHelpType(e.target.value)}>
                  {HELP_TYPES.map((h) => <option key={h.value} value={h.value}>{h.icon} {h.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message (optional)</label>
                <textarea className="form-input form-textarea" rows={3} value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} placeholder="Tell them more about your offer..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHelpModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOfferHelp} disabled={offeringHelp}>
                {offeringHelp ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={id || ''}
        title={post.title}
        description={post.description}
        amountRaised={post.amountRaised}
        targetAmount={post.targetAmount}
      />
    </div>
  );
};

export default PostDetailPage;
