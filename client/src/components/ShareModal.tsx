import React, { useState } from 'react';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  HiOutlineLink, HiOutlineEnvelope,
  HiOutlineXMark,
} from 'react-icons/hi2';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  amountRaised?: number;
  targetAmount?: number;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  title,
  description,
  imageUrl,
  amountRaised = 0,
  targetAmount = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const campaignUrl = `${window.location.origin}/posts/${postId}`;
  const shortDesc = description?.substring(0, 120) || '';

  if (!isOpen) return null;

  const shareText = `Help support "${title}"! ${amountRaised > 0 ? `${formatCurrency(amountRaised)} raised of ${formatCurrency(targetAmount)} goal.` : ''} Every little bit helps.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '✆',
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${campaignUrl}`)}`,
      prominent: true,
    },
    {
      name: 'Facebook',
      icon: 'ⓕ',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'X (Twitter)',
      icon: '𝕏',
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(campaignUrl)}`,
    },
    {
      name: 'Email',
      icon: '✉',
      color: '#EA4335',
      url: `mailto:?subject=${encodeURIComponent(`Help support: ${title}`)}&body=${encodeURIComponent(`${shareText}\n\n${campaignUrl}`)}`,
    },
    {
      name: 'Telegram',
      icon: '⌯⌲',
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Share this fundraiser</h2>
          <button className="modal-close" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>

        <div className="modal-body">
          {/* Campaign preview card */}
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 20,
            border: '1px solid var(--border)',
          }}>
            {imageUrl && (
              <div style={{ position: 'relative', margin: '-16px -16px 14px', overflow: 'hidden', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
                <img
                  src={imageUrl}
                  alt="Campaign preview"
                  style={{ display: 'block', width: '100%', aspectRatio: '1.91 / 1', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 8,
                  padding: '4px 7px',
                  borderRadius: 4,
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}>
                  Forgex Company Limited
                </span>
              </div>
            )}
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{title}</div>
            {shortDesc && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                {shortDesc}...
              </div>
            )}
            {targetAmount > 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--primary-light)', fontWeight: 500 }}>
                {formatCurrency(amountRaised)} raised of {formatCurrency(targetAmount)}
              </div>
            )}
          </div>

          {/* WhatsApp (prominent) */}
          <a
            href={shareOptions[0].url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '14px 20px',
              background: '#25D366',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginBottom: 16,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 211, 102, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Share on WhatsApp
          </a>

          {/* Other share options */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}>
            {shareOptions.slice(1).map((opt) => (
              <a
                key={opt.name}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{opt.icon}</span>
                {opt.name}
              </a>
            ))}
          </div>

          {/* Copy link */}
          <div style={{
            display: 'flex',
            gap: 8,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 4px 4px 14px',
            alignItems: 'center',
          }}>
            <HiOutlineLink style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={campaignUrl}
              readOnly
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCopyLink}
              style={{ flexShrink: 0 }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
