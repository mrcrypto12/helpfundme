import React from 'react';
import { ICampaignUpdate } from '../types';
import { timeAgo, getInitials } from '../utils/helpers';

interface CampaignTimelineProps {
  updates: ICampaignUpdate[];
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  update: { icon: '📢', label: 'Update', color: 'var(--blue-light)' },
  milestone: { icon: '🎯', label: 'Milestone', color: 'var(--gold)' },
  thank_you: { icon: '🙏', label: 'Thank You', color: 'var(--primary-light)' },
  completion: { icon: '🎉', label: 'Completed', color: 'var(--gold)' },
};

const CampaignTimeline: React.FC<CampaignTimelineProps> = ({ updates }) => {
  if (updates.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        No updates yet. Check back soon for news on this campaign.
      </p>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      {updates.map((update, i) => {
        const meta = TYPE_META[update.type] || TYPE_META.update;
        return (
          <div key={update._id} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i === updates.length - 1 ? 0 : 20 }}>
            {i !== updates.length - 1 && (
              <div style={{ position: 'absolute', left: 17, top: 36, bottom: -4, width: 2, background: 'var(--border)' }} />
            )}
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', zIndex: 1,
              }}
            >
              {meta.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {getInitials(update.author?.name || 'U')} · {timeAgo(update.createdAt)}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {update.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignTimeline;