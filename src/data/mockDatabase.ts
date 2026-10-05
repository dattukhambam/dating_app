import {
  UserProfile,
  CallSession,
  CoinPackage,
  PaymentOrder,
  WalletTransaction,
  CreatorEarning,
  WithdrawalRequest,
  UserReport,
  SystemConfiguration,
  ConfigurationHistoryItem,
  AdminUser,
  AdminAuditLog,
} from '../types';
import { PREDEFINED_AVATARS } from './avatars';

export const INITIAL_CONFIG: SystemConfiguration = {
  audioCoinsPerMin: 10,
  videoCoinsPerMin: 20,
  minBillableSeconds: 30,
  roundingMode: 'CEIL_MINUTE',
  creatorSharePercentage: 60,
  platformSharePercentage: 40,
  coinToInrRate: 0.50, // 1 coin = ₹0.50 INR
  minWithdrawalAmountINR: 500,
  reconnectionGraceSeconds: 45,
  lowBalanceWarningCoins: 30,
  updatedAt: new Date().toISOString(),
  updatedBy: 'dinesh@matladuko.com (Super Admin)',
  version: 1,
};

export const INITIAL_COIN_PACKAGES: CoinPackage[] = [
  { id: 'pkg_100', coins: 100, priceINR: 49 },
  { id: 'pkg_500', coins: 500, priceINR: 199, tag: '10% Extra' },
  { id: 'pkg_1000', coins: 1000, priceINR: 349, tag: '20% Extra', isPopular: true },
  { id: 'pkg_5000', coins: 5000, priceINR: 1499, tag: '30% Extra' },
];

export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_CURRENT_USER: UserProfile = {
  id: '',
  phoneNumber: '',
  displayName: 'User',
  gender: 'Male',
  dob: '2000-01-01',
  age: 24,
  preferredLanguage: 'Telugu',
  secondaryLanguages: ['English'],
  avatarId: 'av_aman',
  avatarUrl: PREDEFINED_AVATARS[0].svgUrl,
  status: 'Active',
  isOnline: false,
  isBusy: false,
  coinsBalance: 500,
  totalCallsMade: 0,
  totalCallsReceived: 0,
  totalCallDurationMins: 0,
  earnedCoins: 0,
  withdrawnINR: 0,
  audioRatePerMin: 10,
  videoRatePerMin: 20,
  joinedDate: 'Just now',
  lastActive: 'Just now',
  bio: '',
};

export const INITIAL_SWAPNA_USER: UserProfile = {
  id: '',
  phoneNumber: '',
  displayName: 'User',
  gender: 'Female',
  dob: '2002-05-18',
  age: 24,
  preferredLanguage: 'Telugu',
  secondaryLanguages: ['English'],
  avatarId: 'av_swapna',
  avatarUrl: PREDEFINED_AVATARS[1].svgUrl,
  status: 'Active',
  isOnline: false,
  isBusy: false,
  coinsBalance: 500,
  totalCallsMade: 0,
  totalCallsReceived: 0,
  totalCallDurationMins: 0,
  earnedCoins: 0,
  withdrawnINR: 0,
  audioRatePerMin: 10,
  videoRatePerMin: 20,
  joinedDate: 'Just now',
  lastActive: 'Just now',
  bio: '',
};

export const INITIAL_LIVE_CALLS: CallSession[] = [];

export const INITIAL_CALL_HISTORY: CallSession[] = [];

export const INITIAL_PAYMENTS: PaymentOrder[] = [];

export const INITIAL_WITHDRAWALS: WithdrawalRequest[] = [];

export const INITIAL_REPORTS: UserReport[] = [];

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'ADM_01',
    name: 'Dinesh',
    email: 'dinesh@matladuko.com',
    role: 'Super Admin',
    status: 'Active',
    lastLogin: 'Today, 09:30 AM',
    avatarUrl: PREDEFINED_AVATARS[6].svgUrl,
  },
  {
    id: 'ADM_02',
    name: 'Priya',
    email: 'priya@matladuko.com',
    role: 'Moderator',
    status: 'Active',
    lastLogin: 'Today, 08:15 AM',
    avatarUrl: PREDEFINED_AVATARS[0].svgUrl,
  },
  {
    id: 'ADM_03',
    name: 'Rahul',
    email: 'rahul@matladuko.com',
    role: 'Finance Admin',
    status: 'Active',
    lastLogin: 'Yesterday, 06:40 PM',
    avatarUrl: PREDEFINED_AVATARS[5].svgUrl,
  },
  {
    id: 'ADM_04',
    name: 'Sneha',
    email: 'sneha@matladuko.com',
    role: 'Support Agent',
    status: 'Active',
    lastLogin: 'Today, 10:00 AM',
    avatarUrl: PREDEFINED_AVATARS[2].svgUrl,
  },
  {
    id: 'ADM_05',
    name: 'Vikram',
    email: 'vikram@matladuko.com',
    role: 'Analyst',
    status: 'Inactive',
    lastLogin: '3 days ago',
    avatarUrl: PREDEFINED_AVATARS[7].svgUrl,
  },
];

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'AUD_701',
    adminEmail: 'dinesh@matladuko.com',
    action: 'UPDATE_CONFIG',
    entityType: 'CONFIGURATION',
    entityId: 'CONFIG_V1',
    details: 'Set Video Call rate to 20 coins/min and Creator Share to 60%.',
    timestamp: '18 Sep 2026, 11:20 AM',
    ipAddress: '49.205.142.11',
  },
  {
    id: 'AUD_702',
    adminEmail: 'rahul@matladuko.com',
    action: 'APPROVE_WITHDRAWAL',
    entityType: 'WITHDRAWAL',
    entityId: 'WD1001',
    details: 'Approved ₹2,000 payout to Neha via Bank Transfer.',
    timestamp: '18 Sep 2026, 10:45 AM',
    ipAddress: '157.48.91.4',
  },
  {
    id: 'AUD_703',
    adminEmail: 'priya@matladuko.com',
    action: 'SUSPEND_USER',
    entityType: 'USER',
    entityId: 'USR1007',
    details: 'Suspended user Rahul for policy violation (report #202).',
    timestamp: '18 Sep 2026, 09:15 AM',
    ipAddress: '183.82.110.22',
  },
  {
    id: 'AUD_704',
    adminEmail: 'dinesh@matladuko.com',
    action: 'ADD_COIN_PACKAGE',
    entityType: 'COIN_PACKAGE',
    entityId: 'pkg_5000',
    details: 'Created 5,000 coins package for ₹1,499 with 30% Extra tag.',
    timestamp: '17 Sep 2026, 04:30 PM',
    ipAddress: '49.205.142.11',
  },
];
