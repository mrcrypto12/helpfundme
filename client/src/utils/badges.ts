export interface BadgeMeta {
  id: string;
  label: string;
  icon: string;
  description: string;
  milestone: string;
}

export const BADGE_META: Record<string, BadgeMeta> = {
  first_supporter: { id: 'first_supporter', label: 'First Supporter', icon: 'heart', description: 'Made your first donation', milestone: 'First donation' },
  community_helper: { id: 'community_helper', label: 'Community Helper', icon: 'community', description: 'Supported 5 or more campaigns', milestone: '5 campaigns' },
  angel_supporter: { id: 'angel_supporter', label: 'Angel Supporter', icon: 'star', description: 'Donated over GHS 1,000 in total', milestone: 'GHS 1,000 given' },
  campaign_booster: { id: 'campaign_booster', label: 'Campaign Booster', icon: 'rocket', description: 'Supported 10 or more campaigns', milestone: '10 campaigns' },
};
