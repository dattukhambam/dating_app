import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  CreditCard,
  TrendingUp,
  Wallet,
  Flag,
  Settings,
  ShieldCheck,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Lock,
  Mail,
  ChevronDown,
  RefreshCw,
  Plus,
  ArrowUpDown,
  FileText,
  Clock,
  Server,
  Database,
  Radio,
  Sliders,
  DollarSign,
  UserCheck,
  UserX,
  History,
  X,
  Headphones,
  Video as VideoIcon
} from 'lucide-react';
import {
  UserProfile,
  CallSession,
  PaymentOrder,
  WithdrawalRequest,
  UserReport,
  SystemConfiguration,
  ConfigurationHistoryItem,
  AdminUser,
  AdminAuditLog,
  CoinPackage,
} from '../../types';
import { AudioMonitorModal, VideoMonitorModal } from './LiveCallMonitorModals';
import { apiFetch } from '../../utils/apiConfig';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'user_detail'
  | 'online_users'
  | 'live_calls'
  | 'call_history'
  | 'payments'
  | 'earnings_withdrawals'
  | 'analytics'
  | 'moderation'
  | 'configuration'
  | 'admin_users'
  | 'audit_logs'
  | 'system_health';

export const AdminPanel: React.FC = () => {
  const getInitialTab = (): AdminTab => {
    try {
      const search = window.location.search;
      if (search.includes('tab=live_calls') || window.location.pathname.includes('/live-calls')) {
        return 'live_calls';
      }
      if (search.includes('tab=users')) return 'users';
      if (search.includes('tab=payments')) return 'payments';
    } catch {}
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(true);
  const [adminEmail, setAdminEmail] = useState('dinesh@matladuko.com');
  const [adminPassword, setAdminPassword] = useState('••••••••');
  const [adminRole, setAdminRole] = useState('Super Admin');

  // Server data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [liveCallsList, setLiveCallsList] = useState<CallSession[]>([]);
  const [monitoringAudioCall, setMonitoringAudioCall] = useState<CallSession | null>(null);
  const [monitoringVideoCall, setMonitoringVideoCall] = useState<CallSession | null>(null);
  const [callHistoryList, setCallHistoryList] = useState<CallSession[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentOrder[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [reportsList, setReportsList] = useState<UserReport[]>([]);
  const [config, setConfig] = useState<SystemConfiguration | null>(null);
  const [configHistory, setConfigHistory] = useState<ConfigurationHistoryItem[]>([]);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AdminAuditLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Filters & Sub-tabs
  const [userSearch, setUserSearch] = useState('');
  const [userGenderFilter, setUserGenderFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [earningsSubTab, setEarningsSubTab] = useState<'earnings' | 'withdrawals'>('withdrawals');
  const [reportSubTab, setReportSubTab] = useState<'all' | 'pending' | 'resolved'>('all');
  const [configSubTab, setConfigSubTab] = useState<'coin_settings' | 'call_rates' | 'revenue_share' | 'other'>('coin_settings');
  const [analyticsMetric, setAnalyticsMetric] = useState<'duration' | 'revenue' | 'users'>('duration');

  // Config editing state
  const [editAudioRate, setEditAudioRate] = useState(10);
  const [editVideoRate, setEditVideoRate] = useState(20);
  const [editCreatorShare, setEditCreatorShare] = useState(60);
  const [editPlatformShare, setEditPlatformShare] = useState(40);
  const [editCoinToInr, setEditCoinToInr] = useState(0.5);
  const [editMinWithdrawal, setEditMinWithdrawal] = useState(500);
  const [configSuccessMessage, setConfigSuccessMessage] = useState('');

  // Add package modal
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [newPkgCoins, setNewPkgCoins] = useState('2000');
  const [newPkgPrice, setNewPkgPrice] = useState('699');
  const [newPkgTag, setNewPkgTag] = useState('Special Offer');

  const [toast, setToast] = useState<string | null>(null);
  const [dbTesting, setDbTesting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const handleTestDb = async () => {
    setDbTesting(true);
    try {
      const res = await apiFetch('/api/v1/db/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Supabase PostgreSQL 17 Connected! Latency: ${data.latencyMs}ms | Tables: ${data.tablesCount} | Users: ${data.usersCount}`);
        loadAllAdminData();
      } else {
        showToast(`❌ Connection Error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      showToast(`❌ Network Error: ${err.message}`);
    } finally {
      setDbTesting(false);
    }
  };

  // Fetch all backend data
  const loadAllAdminData = async () => {
    try {
      const [dashRes, usersRes, liveRes, histRes, payRes, wdRes, repRes, cfgRes, admRes, auditRes, healthRes] =
        await Promise.all([
          apiFetch('/api/v1/admin/dashboard').then((r) => r.json()),
          apiFetch('/api/v1/admin/users').then((r) => r.json()),
          apiFetch('/api/v1/admin/live-calls').then((r) => r.json()),
          apiFetch('/api/v1/admin/call-history').then((r) => r.json()),
          apiFetch('/api/v1/admin/payments').then((r) => r.json()),
          apiFetch('/api/v1/admin/withdrawals').then((r) => r.json()),
          apiFetch('/api/v1/admin/reports').then((r) => r.json()),
          apiFetch('/api/v1/admin/configuration').then((r) => r.json()),
          apiFetch('/api/v1/admin/admin-users').then((r) => r.json()),
          apiFetch('/api/v1/admin/audit-logs').then((r) => r.json()),
          apiFetch('/api/v1/admin/system-health').then((r) => r.json()),
        ]);

      setDashboardData(dashRes);
      setUsersList(usersRes.users || []);
      setLiveCallsList(liveRes.liveCalls || []);
      setCallHistoryList(histRes.calls || []);
      setPaymentsList(payRes.payments || []);
      setWithdrawalsList(wdRes.withdrawals || []);
      setReportsList(repRes.reports || []);
      if (cfgRes.config) {
        setConfig(cfgRes.config);
        setEditAudioRate(cfgRes.config.audioCoinsPerMin);
        setEditVideoRate(cfgRes.config.videoCoinsPerMin);
        setEditCreatorShare(cfgRes.config.creatorSharePercentage);
        setEditPlatformShare(cfgRes.config.platformSharePercentage);
        setEditCoinToInr(cfgRes.config.coinToInrRate);
        setEditMinWithdrawal(cfgRes.config.minWithdrawalAmountINR);
        setConfigHistory(cfgRes.history || []);
        setCoinPackages(cfgRes.packages || []);
      }
      setAdminUsersList(admRes.adminUsers || []);
      setAuditLogsList(auditRes.logs || []);
      setSystemHealth(healthRes);
    } catch (e) {
      console.warn('Error fetching admin data', e);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(loadAllAdminData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateUserStatus = async (userId: string, status: 'Active' | 'Suspended' | 'Blocked') => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: 'Admin manual moderation review' }),
      });
      if (res.ok) {
        showToast(`User status set to ${status}`);
        loadAllAdminData();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, status } : null));
        }
      }
    } catch (e) {}
  };

  const handleWithdrawalAction = async (wdId: string, status: 'Success' | 'Rejected') => {
    try {
      const res = await fetch(`/api/v1/admin/withdrawals/${wdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Withdrawal ${wdId} marked as ${status}`);
        loadAllAdminData();
      }
    } catch (e) {}
  };

  const handleTerminateCall = async (callId: string) => {
    try {
      const res = await apiFetch('/api/v1/admin/terminate-call', {
        method: 'POST',
        body: JSON.stringify({ callId, reason: 'Terminated from Admin Supervisor Panel' }),
      });
      if (res.ok) {
        showToast('Call terminated successfully by Admin.');
        setLiveCallsList((prev) => prev.filter((c) => c.id !== callId));
        setMonitoringAudioCall(null);
        setMonitoringVideoCall(null);
      }
    } catch (e) {
      showToast('Error terminating call');
    }
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    try {
      const res = await fetch(`/api/v1/admin/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionTaken: action }),
      });
      if (res.ok) {
        showToast(`Report resolved with action: ${action}`);
        loadAllAdminData();
      }
    } catch (e) {}
  };

  const handleSaveConfiguration = async () => {
    try {
      const res = await apiFetch('/api/v1/admin/configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newConfig: {
            audioCoinsPerMin: Number(editAudioRate),
            videoCoinsPerMin: Number(editVideoRate),
            creatorSharePercentage: Number(editCreatorShare),
            platformSharePercentage: Number(editPlatformShare),
            coinToInrRate: Number(editCoinToInr),
            minWithdrawalAmountINR: Number(editMinWithdrawal),
          },
          reason: 'Admin adjusted calling economy rates and revenue shares',
        }),
      });
      if (res.ok) {
        setConfigSuccessMessage('Configuration snapshot saved and audit trail updated!');
        setTimeout(() => setConfigSuccessMessage(''), 4000);
        loadAllAdminData();
      }
    } catch (e) {}
  };

  const handleAddPackage = async () => {
    try {
      const res = await apiFetch('/api/v1/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: Number(newPkgCoins),
          priceINR: Number(newPkgPrice),
          tag: newPkgTag,
        }),
      });
      if (res.ok) {
        setShowAddPackageModal(false);
        showToast('New Coin Package created successfully!');
        loadAllAdminData();
      }
    } catch (e) {}
  };

  const handleRefundPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/payments/${orderId}/refund`, { method: 'POST' });
      if (res.ok) {
        showToast(`Refund processed for order ${orderId}`);
        loadAllAdminData();
      }
    } catch (e) {}
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!u.displayName.toLowerCase().includes(q) && !u.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (userGenderFilter !== 'All' && u.gender !== userGenderFilter) return false;
    if (userStatusFilter !== 'All' && u.status !== userStatusFilter) return false;
    return true;
  });

  // Filtered reports
  const filteredReports = reportsList.filter((r) => {
    if (reportSubTab === 'pending') return r.status === 'Pending';
    if (reportSubTab === 'resolved') return r.status === 'Resolved';
    return true;
  });

  // ---------------------------------------------------------------------------
  // ADMIN LOGIN VIEW (Screen 1 from Screenshot)
  // ---------------------------------------------------------------------------
  if (!isAdminLoggedIn) {
    return (
      <div className="w-full h-full min-h-[750px] bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          {/* Left Brand Panel */}
          <div className="md:w-1/2 p-8 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 border-r border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-white">Matladuko Admin</span>
              </div>
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-6">
                Manage • Monitor • Grow (తెలుగు అడ్మిన్ ప్యానెల్)
              </p>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Real-time Telugu Users & Live Presence</span>
                </div>
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>WebRTC Live Calls & Server Billing</span>
                </div>
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Payment Gateway & Coin Revenue</span>
                </div>
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>Creator Earnings & INR Payout Approvals</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Admin Access • MFA & RBAC Enforced</span>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-black text-white mb-1">Welcome Back</h2>
            <p className="text-xs text-slate-400 mb-6">Login to your admin account</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus-within:border-indigo-500">
                  <Mail className="w-4 h-4 text-slate-500 mr-2" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@matladuko.com"
                    className="w-full bg-transparent focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus-within:border-indigo-500">
                  <Lock className="w-4 h-4 text-slate-500 mr-2" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-700 text-indigo-600" />
                  <span>Remember me</span>
                </label>
                <span className="text-indigo-400 hover:underline cursor-pointer">Forgot password?</span>
              </div>

              <button
                id="btn-admin-login-submit"
                onClick={() => setIsAdminLoggedIn(true)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-98"
              >
                Login to Admin Console
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN ADMIN CONSOLE (Screens 2 through 14)
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full h-full min-h-[750px] bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-indigo-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* =========================================================================
          LEFT ADMIN SIDEBAR NAVIGATION
      ========================================================================= */}
      <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Admin Brand Logo */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight">Matladuko</h1>
                <p className="text-[10px] text-rose-400 font-semibold uppercase">Admin Panel</p>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Live
            </span>
          </div>

          {/* Navigation Links */}
          <div className="p-2.5 space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'users' || activeTab === 'user_detail'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('online_users')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'online_users'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Online Users (Live)</span>
            </button>

            <button
              onClick={() => setActiveTab('live_calls')}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition ${
                activeTab === 'live_calls'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <PhoneCall className="w-4 h-4 text-rose-400" />
                <span>Live Calls</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {liveCallsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('call_history')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'call_history'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Call History & Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'payments'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payments</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings_withdrawals')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'earnings_withdrawals'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Creator Earnings</span>
            </button>

            <button
              onClick={() => setActiveTab('moderation')}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition ${
                activeTab === 'moderation'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Flag className="w-4 h-4 text-amber-400" />
                <span>Moderation & Reports</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {reportsList.filter((r) => r.status === 'Pending').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Reports & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('configuration')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'configuration'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>App Configuration</span>
            </button>

            <button
              onClick={() => setActiveTab('admin_users')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'admin_users'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Users & RBAC</span>
            </button>

            <button
              onClick={() => setActiveTab('system_health')}
              className={`w-full p-2.5 rounded-xl flex items-center space-x-3 transition ${
                activeTab === 'system_health'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>System Health</span>
            </button>
          </div>
        </div>

        {/* Admin User Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
              D
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">Dinesh (Admin)</div>
              <div className="text-[10px] text-slate-400 truncate">Super Admin</div>
            </div>
          </div>
          <button
            onClick={() => setIsAdminLoggedIn(false)}
            title="Logout Admin"
            className="p-1.5 text-slate-400 hover:text-rose-400 transition"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
      ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50 backdrop-blur-xs">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-black text-white capitalize">
              {activeTab.replace('_', ' ')}
            </h2>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Matladuko Production Infrastructure
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAllAdminData}
              title="Refresh Data"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <span className="text-[11px] font-semibold text-slate-300">Turn/STUN OK</span>
            </div>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* =====================================================================
              TAB 1: DASHBOARD (Screen 2 from Screenshot)
          ===================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Total Users</span>
                  <div className="text-xl font-black text-white mt-1">12,543</div>
                  <span className="text-[10px] text-emerald-400 font-bold">↑ 12% vs last week</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Active Users</span>
                  <div className="text-xl font-black text-white mt-1">2,341</div>
                  <span className="text-[10px] text-emerald-400 font-bold">↑ 8% vs last week</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Calls Completed</span>
                  <div className="text-xl font-black text-white mt-1">843</div>
                  <span className="text-[10px] text-emerald-400 font-bold">↑ 18% vs last week</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Coins Purchased</span>
                  <div className="text-xl font-black text-amber-400 mt-1">1,245</div>
                  <span className="text-[10px] text-slate-400 font-semibold">₹1,24,500 Gross</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Platform Revenue</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">₹78,320</div>
                  <span className="text-[10px] text-emerald-400 font-bold">↑ 22% Net Share</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Creator Payouts</span>
                  <div className="text-xl font-black text-purple-400 mt-1">₹52,600</div>
                  <span className="text-[10px] text-purple-400 font-bold">↑ 16% Paid Creators</span>
                </div>
              </div>

              {/* Call Volume 7 Days Chart */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Call Volume (Last 7 Days)</h3>
                    <p className="text-[11px] text-slate-400">Audio Calls vs Video Calls Breakdown</p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <span className="text-slate-300">Audio Calls</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="text-slate-300">Video Calls</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Chart */}
                <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 px-2 border-b border-slate-800">
                  {[
                    { day: 'Sep 12', audio: 70, video: 55 },
                    { day: 'Sep 13', audio: 85, video: 62 },
                    { day: 'Sep 14', audio: 78, video: 68 },
                    { day: 'Sep 15', audio: 95, video: 80 },
                    { day: 'Sep 16', audio: 110, video: 92 },
                    { day: 'Sep 17', audio: 118, video: 105 },
                    { day: 'Sep 18', audio: 125, video: 114 },
                  ].map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        <div
                          style={{ height: `${(d.audio / 130) * 100}%` }}
                          className="w-3 rounded-t bg-indigo-500 hover:bg-indigo-400 transition"
                          title={`Audio: ${d.audio * 10}`}
                        ></div>
                        <div
                          style={{ height: `${(d.video / 130) * 100}%` }}
                          className="w-3 rounded-t bg-rose-500 hover:bg-rose-400 transition"
                          title={`Video: ${d.video * 10}`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ongoing Live Calls Feed on Dashboard */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>Currently Active Calls ({liveCallsList.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('live_calls')}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    View All Live Calls →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {liveCallsList.slice(0, 4).map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          <img src={c.callerAvatar} alt={c.callerName} className="w-7 h-7 rounded-full border border-slate-800" />
                          <img src={c.calleeAvatar} alt={c.calleeName} className="w-7 h-7 rounded-full border border-slate-800" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{c.callerName} ↔ {c.calleeName}</div>
                          <span className="text-[10px] text-slate-400 capitalize">{c.type} Call • 100% Coturn Relayed</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        On Call
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: USERS MANAGEMENT (Screen 3 from Screenshot)
          ===================================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center w-full md:w-80 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs focus-within:border-indigo-500">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, phone or user ID..."
                    className="bg-transparent w-full text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs font-semibold">
                  {(['All', 'Male', 'Female', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setUserGenderFilter(g)}
                      className={`px-3 py-1.5 rounded-xl transition ${
                        userGenderFilter === g ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Gender</th>
                      <th className="py-3 px-4">Age</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Coins</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{u.id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-full border border-slate-700" />
                            <div>
                              <div className="font-bold text-white">{u.displayName}</div>
                              <span className="text-[10px] text-slate-500">{u.phoneNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{u.gender}</td>
                        <td className="py-3 px-4">{u.age}</td>
                        <td className="py-3 px-4 text-indigo-400 font-semibold">{u.preferredLanguage}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{u.coinsBalance}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'Active'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : u.status === 'Suspended'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setActiveTab('user_detail');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition font-semibold"
                          >
                            View
                          </button>
                          {u.status === 'Active' ? (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'Suspended')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition font-semibold"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'Active')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition font-semibold"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3: USER DETAILS DEEP VIEW (Screen 4 from Screenshot)
          ===================================================================== */}
          {activeTab === 'user_detail' && selectedUser && (
            <div className="space-y-5">
              <button
                onClick={() => setActiveTab('users')}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <span>← Back to Users</span>
              </button>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.displayName}
                    className="w-20 h-20 rounded-full border-4 border-indigo-500/40 shadow-xl"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black text-white">{selectedUser.displayName}</h2>
                      <span className="text-xs text-slate-400">({selectedUser.id})</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        {selectedUser.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Gender: {selectedUser.gender} • Age: {selectedUser.age} • Languages: {selectedUser.preferredLanguage}, {selectedUser.secondaryLanguages.join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Joined On: {selectedUser.joinedDate} • Last Active: {selectedUser.lastActive}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => handleUpdateUserStatus(selectedUser.id, 'Blocked')}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-slate-700"
                  >
                    Block User
                  </button>
                  <button
                    onClick={() => handleUpdateUserStatus(selectedUser.id, 'Suspended')}
                    className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Suspend Account
                  </button>
                </div>
              </div>

              {/* 4 Lifetime Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Calls Made/Recv</span>
                  <span className="text-xl font-black text-white mt-1 block">
                    {selectedUser.totalCallsMade + selectedUser.totalCallsReceived}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Call Duration</span>
                  <span className="text-xl font-black text-indigo-400 mt-1 block">
                    {selectedUser.totalCallDurationMins} mins
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Coins Balance</span>
                  <span className="text-xl font-black text-amber-400 mt-1 block">
                    {selectedUser.coinsBalance}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Withdrawn (INR)</span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">
                    ₹{selectedUser.withdrawnINR}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 4: ONLINE USERS (LIVE) (Screen 5 from Screenshot)
          ===================================================================== */}
          {activeTab === 'online_users' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Real-Time Online Telugu Speakers</span>
                  </h3>
                  <p className="text-xs text-slate-400">Total Online Users: 1,024</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {usersList
                  .filter((u) => u.isOnline)
                  .map((u) => (
                    <div key={u.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img src={u.avatarUrl} alt={u.displayName} className="w-11 h-11 rounded-full border border-slate-700" />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{u.displayName}, {u.age}</div>
                          <span className="text-[10px] text-slate-400 block">{u.preferredLanguage} • {u.gender}</span>
                          <span className="text-[9px] text-emerald-400 font-bold">🟢 Active Now</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setActiveTab('user_detail');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                      >
                        View
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 5: LIVE CALLS MONITORING (Screen 6 from Screenshot)
          ===================================================================== */}
          {activeTab === 'live_calls' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>Live Calls Monitoring</span>
                  </h3>
                  <p className="text-xs text-slate-400">Total Live Concurrent Calls: {liveCallsList.length}</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User A (Caller)</th>
                      <th className="py-3 px-4">User B (Callee)</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {liveCallsList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <img src={c.callerAvatar} alt={c.callerName} className="w-6 h-6 rounded-full" />
                            <span className="font-bold text-white">{c.callerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <img src={c.calleeAvatar} alt={c.calleeName} className="w-6 h-6 rounded-full" />
                            <span className="font-bold text-white">{c.calleeName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize font-semibold text-indigo-400">{c.type}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {Math.floor(c.durationSeconds / 60)}:{(c.durationSeconds % 60).toString().padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            • On Call
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setMonitoringAudioCall(c)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center space-x-1"
                              title="Listen to Live Audio Feed"
                            >
                              <Headphones className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </button>

                            <button
                              onClick={() => setMonitoringVideoCall(c)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center space-x-1"
                              title="View Live Split Screens"
                            >
                              <VideoIcon className="w-3.5 h-3.5" />
                              <span>View Video</span>
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Force end call ${c.id}?`)) {
                                  handleTerminateCall(c.id);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs"
                              title="Force Terminate Call"
                            >
                              Terminate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 6: CALL RECORDINGS & LOGS (Screen 7 from Screenshot)
          ===================================================================== */}
          {activeTab === 'call_history' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Call Recordings & Historical Logs</h3>
                  <p className="text-xs text-slate-400">01 Sep 2026 - 18 Sep 2026</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User A</th>
                      <th className="py-3 px-4">User B</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Coins Billed</th>
                      <th className="py-3 px-4">Retention Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {callHistoryList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{c.callerName}</td>
                        <td className="py-3 px-4 font-bold text-white">{c.calleeName}</td>
                        <td className="py-3 px-4 capitalize text-indigo-400">{c.type}</td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {Math.floor(c.durationSeconds / 60)}m {c.durationSeconds % 60}s
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-400">{c.billedCoins} Coins</td>
                        <td className="py-3 px-4 text-emerald-400 text-[11px]">Metadata Logged (90d)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 7: PAYMENTS (Screen 8 from Screenshot)
          ===================================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Payment Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Total Revenue</span>
                  <div className="text-xl font-black text-white mt-1">₹1,24,500</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Successful Orders</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">1,245</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Failed Orders</span>
                  <div className="text-xl font-black text-rose-400 mt-1">32</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Refunds</span>
                  <div className="text-xl font-black text-amber-400 mt-1">₹2,450</div>
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Coins Credited</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paymentsList.map((p) => (
                      <tr key={p.orderId} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{p.orderId}</td>
                        <td className="py-3 px-4 font-bold text-white">{p.userName}</td>
                        <td className="py-3 px-4 font-black text-white">₹{p.amountINR}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{p.coins} Coins</td>
                        <td className="py-3 px-4 text-slate-400">{p.paymentMethod}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.status === 'Success'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : p.status === 'Refunded'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{p.timestamp}</td>
                        <td className="py-3 px-4 text-right">
                          {p.status === 'Success' && (
                            <button
                              onClick={() => handleRefundPayment(p.orderId)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-[11px] font-semibold"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 8: CREATOR EARNINGS & WITHDRAWALS (Screen 9 from Screenshot)
          ===================================================================== */}
          {activeTab === 'earnings_withdrawals' && (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 w-fit">
                <button
                  onClick={() => setEarningsSubTab('withdrawals')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    earningsSubTab === 'withdrawals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Withdrawal Requests ({withdrawalsList.length})
                </button>
                <button
                  onClick={() => setEarningsSubTab('earnings')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    earningsSubTab === 'earnings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Creator Balance Ledgers
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Total Creator Earnings</span>
                  <div className="text-xl font-black text-indigo-400 mt-1">₹52,600</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Total Withdrawn</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">₹28,400</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Pending Requests</span>
                  <div className="text-xl font-black text-amber-400 mt-1">₹18,200</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Payout Requests</span>
                  <div className="text-xl font-black text-white mt-1">126</div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Request ID</th>
                      <th className="py-3 px-4">Creator</th>
                      <th className="py-3 px-4">Amount (INR)</th>
                      <th className="py-3 px-4">Method & Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {withdrawalsList.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{w.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{w.userName}</td>
                        <td className="py-3 px-4 font-black text-emerald-400">₹{w.amountINR}</td>
                        <td className="py-3 px-4 text-slate-300">{w.payoutMethod} ({w.accountDetails})</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              w.status === 'Success'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : w.status === 'Pending'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{w.date}</td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {w.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleWithdrawalAction(w.id, 'Success')}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleWithdrawalAction(w.id, 'Rejected')}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 9: REPORTS & ANALYTICS (Screen 10 from Screenshot)
          ===================================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Total Lifetime Calls</span>
                  <div className="text-xl font-black text-white mt-1">25,431</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Audio Calls</span>
                  <div className="text-xl font-black text-indigo-400 mt-1">18,542</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Video Calls</span>
                  <div className="text-xl font-black text-rose-400 mt-1">6,889</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block">Total Minutes Talked</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">2,45,920</div>
                </div>
              </div>

              {/* Interactive Duration Graph */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Call Duration & Concurrency Distribution</h3>
                  <div className="flex space-x-2 text-xs">
                    <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold">Audio: 73%</span>
                    <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-bold">Video: 27%</span>
                  </div>
                </div>

                <div className="h-44 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-800">
                  {[
                    { slot: '12 AM', mins: 12000 },
                    { slot: '3 AM', mins: 6500 },
                    { slot: '6 AM', mins: 4200 },
                    { slot: '9 AM', mins: 14000 },
                    { slot: '12 PM', mins: 19500 },
                    { slot: '3 PM', mins: 21000 },
                    { slot: '6 PM', mins: 28000 },
                    { slot: '9 PM', mins: 34500 },
                    { slot: '11 PM', mins: 38200 },
                  ].map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        style={{ height: `${(s.mins / 40000) * 100}%` }}
                        className="w-full max-w-[28px] rounded-t bg-gradient-to-t from-indigo-600 to-rose-500 hover:opacity-90 transition"
                      ></div>
                      <span className="text-[10px] text-slate-400 font-medium">{s.slot}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 10: MODERATION & REPORTS (Screen 11 from Screenshot)
          ===================================================================== */}
          {activeTab === 'moderation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 w-fit">
                  <button
                    onClick={() => setReportSubTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportSubTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({reportsList.length})
                  </button>
                  <button
                    onClick={() => setReportSubTab('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportSubTab === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending ({reportsList.filter((r) => r.status === 'Pending').length})
                  </button>
                  <button
                    onClick={() => setReportSubTab('resolved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportSubTab === 'resolved' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resolved ({reportsList.filter((r) => r.status === 'Resolved').length})
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Reported User</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Moderator Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{r.reporterName}</td>
                        <td className="py-3 px-4 font-bold text-rose-400">{r.reportedUserName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold text-[11px]">
                            {r.reason}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.status === 'Pending'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {r.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => handleResolveReport(r.id, 'Warned user & logged violation')}
                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold"
                              >
                                Warn
                              </button>
                              <button
                                onClick={() => handleResolveReport(r.id, 'Suspended reported user')}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleResolveReport(r.id, 'Dismissed - No violation found')}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">{r.actionTaken}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 11: APP CONFIGURATION & SNAPSHOTS (Screen 12 from Screenshot)
          ===================================================================== */}
          {activeTab === 'configuration' && (
            <div className="space-y-5">
              {configSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  {configSuccessMessage}
                </div>
              )}

              {/* Sub-tabs */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 w-fit">
                {(['coin_settings', 'call_rates', 'revenue_share', 'other'] as const).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setConfigSubTab(sub)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${
                      configSubTab === sub ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Sub Tab: Coin Packages */}
              {configSubTab === 'coin_settings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Active Coin Packages (Client Store)</h3>
                    <button
                      onClick={() => setShowAddPackageModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Package</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    {coinPackages.map((pkg) => (
                      <div key={pkg.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-black text-white">{pkg.coins} Coins</span>
                            {pkg.tag && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {pkg.tag}
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-bold text-emerald-400">₹{pkg.priceINR}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-3">ID: {pkg.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub Tab: Call Rates */}
              {configSubTab === 'call_rates' && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-xl">
                  <h3 className="text-sm font-bold text-white">Call Rates Configuration (per minute)</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Audio Call (Coins / Min)</label>
                      <input
                        type="number"
                        value={editAudioRate}
                        onChange={(e) => setEditAudioRate(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Video Call (Coins / Min)</label>
                      <input
                        type="number"
                        value={editVideoRate}
                        onChange={(e) => setEditVideoRate(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveConfiguration}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Save Call Rates Snapshot
                    </button>
                  </div>
                </div>
              )}

              {/* Sub Tab: Revenue Share */}
              {configSubTab === 'revenue_share' && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-xl">
                  <h3 className="text-sm font-bold text-white">Revenue Share & Coin-to-Rupee Economics</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Creator Share (%)</label>
                      <input
                        type="number"
                        value={editCreatorShare}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditCreatorShare(val);
                          setEditPlatformShare(100 - val);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Platform Share (%)</label>
                      <input
                        type="number"
                        disabled
                        value={editPlatformShare}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Coin to INR Conversion (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={editCoinToInr}
                        onChange={(e) => setEditCoinToInr(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">1 Coin = ₹{editCoinToInr}</span>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Min Withdrawal Limit (₹)</label>
                      <input
                        type="number"
                        value={editMinWithdrawal}
                        onChange={(e) => setEditMinWithdrawal(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveConfiguration}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Save Revenue & Payout Snapshot
                    </button>
                  </div>
                </div>
              )}

              {/* Sub Tab: Other Settings & Historical Snapshots */}
              {configSubTab === 'other' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <h3 className="text-sm font-bold text-white mb-2">Immutable Historical Snapshots</h3>
                    <p className="text-slate-400">
                      Every configuration change preserves a permanent snapshot so historical call records are never recalculated using future rates.
                    </p>
                    <div className="space-y-2 pt-2">
                      {configHistory.map((h) => (
                        <div key={h.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white">Snapshot v{h.version}</span>
                            <p className="text-[11px] text-slate-400">{h.reason}</p>
                          </div>
                          <span className="text-[10px] text-slate-500">{h.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB 12: ADMIN USERS & RBAC (Screen 13 from Screenshot)
          ===================================================================== */}
          {activeTab === 'admin_users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Admin Team & Role-Based Access Control (RBAC)</h3>
                  <p className="text-xs text-slate-400">MFA & IP-whitelisted secure administration</p>
                </div>
                <button
                  onClick={() => showToast('Add Admin modal opened')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Admin</span>
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {adminUsersList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                            {a.name[0]}
                          </div>
                          <span>{a.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{a.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                            {a.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{a.lastLogin}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => showToast(`Audit trail view for ${a.name}`)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                          >
                            Permissions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Audit Logs Table */}
              <div className="mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  System Audit Logs (Immutable)
                </h3>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-xs">
                  <div className="divide-y divide-slate-800/60">
                    {auditLogsList.map((log) => (
                      <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-800/40">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-indigo-400">{log.action}</span>
                            <span className="text-[10px] text-slate-400">by {log.adminEmail}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-0.5">{log.details}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <div>{log.timestamp}</div>
                          <div>IP: {log.ipAddress}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 13: SYSTEM HEALTH & INFRASTRUCTURE
          ===================================================================== */}
          {activeTab === 'system_health' && systemHealth && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Open-Source & Cloud Infrastructure Telemetry</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Overall Cluster Health: <span className="text-emerald-400 font-bold">{systemHealth.status}</span> • Connected to Supabase PostgreSQL 17
                  </p>
                </div>
                <button
                  onClick={handleTestDb}
                  disabled={dbTesting}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{dbTesting ? 'Testing Connection...' : '⚡ Test Supabase DB'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Supabase PostgreSQL 17 Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-bold text-white">PostgreSQL 17 (Supabase)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {systemHealth.services.postgres.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-300 text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-400 truncate">Host: <span className="text-indigo-300">db.ntybpccjjbxvdcksnqph.supabase.co:5432</span></p>
                    <p className="text-slate-400">Database: <span className="text-emerald-300">postgres</span> | User: <span className="text-emerald-300">postgres</span></p>
                    <p className="text-slate-400">Tables in Schema: <span className="text-white font-bold">{systemHealth.services.postgres.tablesCount || 26}</span></p>
                    <p className="text-slate-400">Registered Users: <span className="text-white font-bold">{systemHealth.services.postgres.usersCount || 11}</span></p>
                    <p className="text-slate-400">Round-trip Latency: <span className="text-emerald-400 font-bold">{systemHealth.services.postgres.pingMs}ms</span></p>
                  </div>
                  <span className="text-indigo-400 text-[10px] block font-mono">Authoritative Source of Truth & Ledgers</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">Redis Presence & Cache</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {systemHealth.services.redisPresence.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Online Keys: {systemHealth.services.redisPresence.onlineKeysCount}</p>
                  <p className="text-slate-400 text-[11px]">Ping: {systemHealth.services.redisPresence.pingMs}ms</p>
                  <span className="text-indigo-400 text-[10px] block mt-2 font-mono">Ephemeral State Only</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">Coturn STUN/TURN</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {systemHealth.services.coturnServer.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Active Relays: {systemHealth.services.coturnServer.activeTurnRelays}</p>
                  <p className="text-slate-400 text-[11px]">Host: {systemHealth.services.coturnServer.address}</p>
                  <span className="text-indigo-400 text-[10px] block mt-2 font-mono">WebRTC NAT Traversal</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">Apache Kafka Event Mesh</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {systemHealth.services.kafkaBroker.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Topics: {systemHealth.services.kafkaBroker.topicsCount}</p>
                  <p className="text-slate-400 text-[11px]">Consumer Lag: {systemHealth.services.kafkaBroker.consumerLag}</p>
                  <span className="text-indigo-400 text-[10px] block mt-2 font-mono">Async Billing & Notification Queue</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">WebSocket Gateway</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {systemHealth.services.webSocketGateway.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Connected Sockets: {systemHealth.services.webSocketGateway.connectedClients}</p>
                  <span className="text-indigo-400 text-[10px] block mt-2 font-mono">Real-time Presence & WebRTC Signaling</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Package Modal */}
      {showAddPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 text-xs">
            <h3 className="text-sm font-bold text-white mb-3">Add New Coin Package</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Coins Count</label>
                <input
                  type="number"
                  value={newPkgCoins}
                  onChange={(e) => setNewPkgCoins(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Price (INR)</label>
                <input
                  type="number"
                  value={newPkgPrice}
                  onChange={(e) => setNewPkgPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Offer Tag (Optional)</label>
                <input
                  type="text"
                  value={newPkgTag}
                  onChange={(e) => setNewPkgTag(e.target.value)}
                  placeholder="e.g. 25% Extra, Festive Special"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowAddPackageModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPackage}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold"
                >
                  Create Package
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Live Call Monitoring Modals */}
      {monitoringAudioCall && (
        <AudioMonitorModal
          call={monitoringAudioCall}
          onClose={() => setMonitoringAudioCall(null)}
          onTerminate={handleTerminateCall}
          showToast={showToast}
        />
      )}
      {monitoringVideoCall && (
        <VideoMonitorModal
          call={monitoringVideoCall}
          onClose={() => setMonitoringVideoCall(null)}
          onTerminate={handleTerminateCall}
          showToast={showToast}
        />
      )}
    </div>
  );
};
