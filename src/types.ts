export type Gender = 'Male' | 'Female' | 'Other';
export type UserStatus = 'Active' | 'Suspended' | 'Blocked';
export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connected' | 'rejected' | 'missed' | 'cancelled' | 'ended' | 'failed';
export type PaymentStatus = 'Success' | 'Failed' | 'Refunded';
export type WithdrawalStatus = 'Pending' | 'Success' | 'Rejected';
export type ReportReason = 'Harassment' | 'Inappropriate' | 'Fake Profile' | 'Spam' | 'Abuse';
export type ReportStatus = 'Pending' | 'Resolved' | 'Dismissed';
export type AdminRole = 'Super Admin' | 'Moderator' | 'Finance Admin' | 'Support Agent' | 'Analyst';

export interface PredefinedAvatar {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'unisex';
  svgUrl: string;
  accentColor: string;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  displayName: string;
  gender: Gender;
  dob: string;
  age: number;
  preferredLanguage: string; // Telugu, Hindi, English, etc.
  secondaryLanguages: string[];
  avatarId: string;
  avatarUrl: string;
  status: UserStatus;
  isOnline: boolean;
  isBusy: boolean;
  isFavorite?: boolean;
  coinsBalance: number;
  totalCallsMade: number;
  totalCallsReceived: number;
  totalCallDurationMins: number;
  earnedCoins: number;
  withdrawnINR: number;
  audioRatePerMin: number; // e.g. 10 coins/min
  videoRatePerMin: number; // e.g. 20 coins/min
  joinedDate: string;
  lastActive: string;
  bio?: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar: string;
  type: CallType;
  status: CallStatus;
  startTime: number | null; // connected timestamp in ms
  endTime: number | null;
  durationSeconds: number;
  billedCoins: number;
  audioRate: number;
  videoRate: number;
  creatorCoinsEarned: number;
  platformCoinsEarned: number;
  coinToInrRate: number;
  createdAt: number;
  rtcOffer?: string;
  iceServers?: { urls: string | string[] }[];
}

export interface CoinPackage {
  id: string;
  coins: number;
  priceINR: number;
  tag?: string; // e.g. "10% Extra", "Best Value"
  isPopular?: boolean;
}

export interface PaymentOrder {
  orderId: string;
  userId: string;
  userName: string;
  packageId: string;
  amountINR: number;
  coins: number;
  status: PaymentStatus;
  paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Wallet';
  timestamp: string;
  transactionRef: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'CREDIT_PURCHASE' | 'DEBIT_CALL' | 'CREDIT_EARNING' | 'REFUND' | 'WITHDRAWAL_LOCK';
  amountCoins: number;
  balanceAfter: number;
  referenceId: string; // callId or orderId
  description: string;
  createdAt: string;
}

export interface CreatorEarning {
  id: string;
  creatorId: string;
  callSessionId: string;
  grossCoins: number;
  creatorSharePercentage: number;
  earnedCoins: number;
  equivalentINR: number;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amountINR: number;
  coinsDeducted: number;
  payoutMethod: 'Bank Transfer' | 'UPI';
  accountDetails: string;
  status: WithdrawalStatus;
  date: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: ReportReason;
  notes?: string;
  date: string;
  status: ReportStatus;
  actionTaken?: string;
}

export interface SystemConfiguration {
  audioCoinsPerMin: number;
  videoCoinsPerMin: number;
  minBillableSeconds: number;
  roundingMode: 'CEIL_MINUTE' | 'EXACT_PER_SECOND' | 'HALF_MINUTE';
  creatorSharePercentage: number;
  platformSharePercentage: number;
  coinToInrRate: number; // e.g. 0.50 INR per coin
  minWithdrawalAmountINR: number;
  reconnectionGraceSeconds: number;
  lowBalanceWarningCoins: number;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface ConfigurationHistoryItem {
  id: string;
  version: number;
  config: SystemConfiguration;
  changedBy: string;
  timestamp: string;
  reason: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  avatarUrl?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}
