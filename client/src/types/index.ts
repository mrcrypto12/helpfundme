export interface IVerification {
  identity: boolean;
  phone: boolean;
  documents: boolean;
  status?: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  legalName?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  documentsList?: Array<{ originalName: string; publicId: string }>;
  adminNotes?: string;
  issueReportedAt?: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  accountStatus?: 'active' | 'deactivated';
  emailVerified?: boolean;
  isVerified: boolean;
  totalDonated: number;
  bio: string;
  phone: string;
  location: string;
  badges: string[];
  campaignsSupported: number;
  peopleHelped: number;
  verification: IVerification;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISurgeryDetails {
  hospital: string;
  duration: string;
  sessions: number;
  description: string;
}

export interface IFundBreakdownItem {
  label: string;
  amount: number;
  spent: boolean;
}

export interface IBeneficiary {
  name: string;
  relationship: string;
  phone?: string;
  verified: boolean;
}

export interface ICoOrganizer {
  user: IUser | string;
  role: 'editor' | 'sharer';
  inviteStatus: 'pending' | 'accepted' | 'declined';
}

export interface IPost {
  _id: string;
  author: IUser;
  title: string;
  description: string;
  purpose: string;
  targetAmount: number;
  amountRaised: number;
  images: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'medical' | 'education' | 'housing' | 'emergency' | 'funeral' | 'business' | 'other';
  isSurgery: boolean;
  surgeryDetails?: ISurgeryDetails;
  location: {
    city: string;
    region: string;
  };
  status: 'draft' | 'pending' | 'approved' | 'declined' | 'suspended' | 'completed';
  viewCount: number;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  donorsCount: number;
  isActive: boolean;
  adminNotes: string;
  declineReason: string;
  progress: number;
  milestonesReached: number[];
  fundBreakdown: IFundBreakdownItem[];
  beneficiary?: IBeneficiary;
  coOrganizers: ICoOrganizer[];
  evidenceDocuments?: Array<{ originalName: string }>;
  evidenceSummary?: string;
  applicantVerification?: Record<string, string>;
  beneficiaryVerification?: Record<string, string>;
  beneficiaryType?: 'self' | 'other';
  consentConfirmed?: boolean;
  guardianConsent?: boolean;
  reviewHistory?: Array<{ action: string; note: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ICampaignUpdate {
  _id: string;
  post: string;
  author: IUser;
  content: string;
  images: string[];
  videoUrl: string;
  type: 'update' | 'milestone' | 'thank_you' | 'completion';
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  _id: string;
  recipient: string;
  type: string;
  title: string;
  message: string;
  relatedPost?: { _id: string; title: string; images: string[] };
  relatedUser?: { _id: string; name: string; avatar: string };
  isRead: boolean;
  createdAt: string;
}

export interface IDonation {
  _id: string;
  donor: IUser;
  post?: IPost;
  amount: number;
  currency: string;
  type: 'post' | 'platform';
  paymentRef: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  transactionId: string;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface IReceipt {
  receiptNumber: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  currency: string;
  campaignTitle: string;
  type: 'post' | 'platform';
  transactionId: string;
  paymentRef: string;
  date: string;
  platformName: string;
}

export interface IRecurringDonation {
  _id: string;
  donor: string;
  post?: { _id: string; title: string; images: string[] };
  amount: number;
  type: 'post' | 'platform';
  frequency: 'weekly' | 'monthly';
  status: 'active' | 'paused' | 'cancelled';
  totalCharged: number;
  chargeCount: number;
  createdAt: string;
}

export interface IWithdrawal {
  _id: string;
  post: { _id: string; title: string; amountRaised?: number } | string;
  requestedBy: { _id: string; name: string; email: string } | string;
  amount: number;
  method: 'bank' | 'mobile_money';
  bankInfo?: { bank: string; accountNumber: string; accountName: string };
  mobileMoneyInfo?: { provider: string; phone: string; name: string };
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  adminNotes: string;
  createdAt: string;
}

export interface IRefund {
  _id: string;
  donation: IDonation;
  requestedBy: { _id: string; name: string; email: string } | string;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  adminNotes: string;
  createdAt: string;
}

export interface IHelpOffer {
  _id: string;
  user: { _id: string; name: string; avatar: string };
  post: string;
  type: 'share' | 'items' | 'transport' | 'professional' | 'prayer';
  message: string;
  status: 'offered' | 'accepted' | 'completed';
  createdAt: string;
}

export interface IComment {
  _id: string;
  author: IUser;
  post: string;
  content: string;
  likes: string[];
  likesCount: number;
  createdAt: string;
}

export interface IPlatformFund {
  _id: string;
  totalBalance: number;
  totalReceived: number;
  totalAllocated: number;
  allocations: IAllocation[];
}

export interface IAllocation {
  post: IPost;
  amount: number;
  allocatedBy: IUser;
  reason: string;
  date: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IAdminStats {
  users: { total: number };
  posts: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
    completed: number;
  };
  donations: {
    count: number;
    totalAmount: number;
    platformDonations: number;
    postDonations: number;
  };
  platformFund: {
    balance: number;
    totalReceived: number;
    totalAllocated: number;
  };
}

export interface IDonationStats {
  totalAmount: number;
  totalDonations: number;
  uniqueDonors: number;
}

export interface IRegionStat {
  region: string;
  count: number;
  totalRaised: number;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type PostCategory = 'medical' | 'education' | 'housing' | 'emergency' | 'funeral' | 'business' | 'other';
export type PostStatus = 'pending' | 'approved' | 'declined' | 'completed';

export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
  'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo',
  'Oti', 'Bono East', 'Ahafo', 'Savannah', 'North East',
  'Western North',
] as const;

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#FF6D00',
  critical: '#EF5350',
};

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  medical: 'Medical',
  education: 'Education',
  housing: 'Housing',
  emergency: 'Emergency',
  funeral: 'Funeral',
  business: 'Business',
  other: 'Other',
};
