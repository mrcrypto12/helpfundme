export interface BadgeMeta {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const BADGE_META: Record<string, BadgeMeta> = {
  first_supporter: { id: 'first_supporter', label: 'First Supporter', icon: '❤️', description: 'Made your first donation' },
  community_helper: { id: 'community_helper', label: 'Community Helper', icon: '🤝', description: 'Supported 5+ campaigns' },
  angel_supporter: { id: 'angel_supporter', label: 'Angel Supporter', icon: '🌟', description: 'Donated over GHS 1,000 total' },
  campaign_booster: { id: 'campaign_booster', label: 'Campaign Booster', icon: '🔥', description: 'Supported 10+ campaigns' },
};