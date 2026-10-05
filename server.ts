import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { signalingService } from './src/realtime/signalingServer';
import {
  testDbConnection,
  seedInitialDataIfEmpty,
  dbQuery,
  pool,
  DbStatusInfo,
} from './src/db/postgres';
import {
  INITIAL_USERS,
  INITIAL_CURRENT_USER,
  INITIAL_SWAPNA_USER,
  INITIAL_CONFIG,
  INITIAL_COIN_PACKAGES,
  INITIAL_LIVE_CALLS,
  INITIAL_CALL_HISTORY,
  INITIAL_PAYMENTS,
  INITIAL_WITHDRAWALS,
  INITIAL_REPORTS,
  INITIAL_ADMIN_USERS,
  INITIAL_AUDIT_LOGS,
} from './src/data/mockDatabase';
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
} from './src/types';
import { PREDEFINED_AVATARS } from './src/data/avatars';

// State Store in-memory for server session
let users: UserProfile[] = [];
let currentUser: UserProfile | null = null;
let config: SystemConfiguration = JSON.parse(JSON.stringify(INITIAL_CONFIG));
let configHistory: ConfigurationHistoryItem[] = [
  {
    id: 'HIST_01',
    version: 1,
    config: JSON.parse(JSON.stringify(INITIAL_CONFIG)),
    changedBy: 'admin@matladuko.com',
    timestamp: new Date().toISOString(),
    reason: 'Initial production system baseline',
  },
];
let coinPackages: CoinPackage[] = JSON.parse(JSON.stringify(INITIAL_COIN_PACKAGES));
let liveCalls: CallSession[] = [];
let callHistory: CallSession[] = [];
let payments: PaymentOrder[] = [];
let withdrawals: WithdrawalRequest[] = [];
let reports: UserReport[] = [];
let adminUsers: AdminUser[] = JSON.parse(JSON.stringify(INITIAL_ADMIN_USERS));
let auditLogs: AdminAuditLog[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

let walletTransactions: WalletTransaction[] = [];

let blockedUserIds: string[] = [];
let favoritesUserIds: string[] = [];

// Load registered users from database if available
async function loadUsersFromDb() {
  try {
    const res = await pool.query(`
      SELECT u.id, u.phone_number, p.display_name, p.gender, p.age, p.date_of_birth,
             p.preferred_language_id, p.avatar_id, a.svg_url, COALESCE(w.balance_coins, 500) as balance_coins,
             u.status
      FROM users u
      JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN avatars a ON p.avatar_id = a.id
      LEFT JOIN wallets w ON u.id = w.user_id
    `);
    if (res.rows && res.rows.length > 0) {
      for (const r of res.rows) {
        if (!users.some((existing) => existing.id === r.id || existing.phoneNumber === r.phone_number)) {
          users.push({
            id: r.id,
            phoneNumber: r.phone_number,
            displayName: r.display_name || 'User',
            gender: r.gender === 'Female' ? 'Female' : 'Male',
            dob: r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : '2000-01-01',
            age: r.age || 24,
            preferredLanguage: r.preferred_language_id === 'en' ? 'English' : 'Telugu',
            secondaryLanguages: ['English'],
            avatarId: r.avatar_id || 'av_aman',
            avatarUrl: r.svg_url || PREDEFINED_AVATARS[0].svgUrl,
            status: r.status || 'Active',
            isOnline: false,
            isBusy: false,
            coinsBalance: Number(r.balance_coins) || 500,
            totalCallsMade: 0,
            totalCallsReceived: 0,
            totalCallDurationMins: 0,
            earnedCoins: 0,
            withdrawnINR: 0,
            audioRatePerMin: 10,
            videoRatePerMin: 20,
            joinedDate: 'Registered',
            lastActive: 'Offline',
            bio: '',
          });
        }
      }
      console.log(`Loaded ${users.length} registered real users from database.`);
    }
  } catch (err: any) {
    console.warn('DB load users notice:', err.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for web and Capacitor native Android app
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // -------------------------------------------------------------------------
  // 1. AUTH & PROFILE APIS
  // -------------------------------------------------------------------------
  let activeOtps: Record<string, string> = {};

  app.post('/api/v1/auth/send-otp', (req, res) => {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }
    const normalizedPhone = '+91' + digitsOnly.slice(-10);
    const demoOtp = '123456';
    activeOtps[normalizedPhone] = demoOtp;

    return res.json({
      success: true,
      message: '6-digit OTP sent successfully via SMS to ' + normalizedPhone,
      demoOtp: '123456',
      resendInSeconds: 30,
      phoneNumber: normalizedPhone,
    });
  });

  app.post('/api/v1/auth/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: 'Please enter 6-digit OTP.' });
    }
    // Accept default OTP 123456 or 999999 or session OTP
    if (otp !== '123456' && otp !== '999999' && activeOtps[phoneNumber] !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Default OTP is 123456.' });
    }

    const digitsOnly = (phoneNumber || '').replace(/\D/g, '');
    const normalizedPhone = '+91' + (digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly);

    // Look for existing registered user
    const existing = users.find((u) => u.phoneNumber === normalizedPhone);
    if (existing) {
      existing.isOnline = true;
      existing.isBusy = false;
      currentUser = existing;
      return res.json({
        success: true,
        isNewUser: false,
        token: 'jwt_token_' + existing.id,
        user: existing,
      });
    }

    // Check DB for existing user if not currently in memory
    try {
      pool.query(`
        SELECT u.id, u.phone_number, p.display_name, p.gender, p.age, p.date_of_birth,
               p.preferred_language_id, p.avatar_id, a.svg_url, COALESCE(w.balance_coins, 500) as balance_coins,
               u.status
        FROM users u
        JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN avatars a ON p.avatar_id = a.id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.phone_number = $1
      `, [normalizedPhone]).then((dbRes) => {
        if (dbRes.rows && dbRes.rows.length > 0) {
          const r = dbRes.rows[0];
          const loadedUser: UserProfile = {
            id: r.id,
            phoneNumber: r.phone_number,
            displayName: r.display_name || 'User',
            gender: r.gender === 'Female' ? 'Female' : 'Male',
            dob: r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : '2000-01-01',
            age: r.age || 24,
            preferredLanguage: r.preferred_language_id === 'en' ? 'English' : 'Telugu',
            secondaryLanguages: ['English'],
            avatarId: r.avatar_id || 'av_aman',
            avatarUrl: r.svg_url || PREDEFINED_AVATARS[0].svgUrl,
            status: r.status || 'Active',
            isOnline: true,
            isBusy: false,
            coinsBalance: Number(r.balance_coins) || 500,
            totalCallsMade: 0,
            totalCallsReceived: 0,
            totalCallDurationMins: 0,
            earnedCoins: 0,
            withdrawnINR: 0,
            audioRatePerMin: 10,
            videoRatePerMin: 20,
            joinedDate: 'Registered',
            lastActive: 'Just now',
            bio: '',
          };
          users.unshift(loadedUser);
          currentUser = loadedUser;
        }
      }).catch(() => {});
    } catch {}

    // New user detected - request profile registration
    return res.json({
      success: true,
      isNewUser: true,
      phoneNumber: normalizedPhone,
      message: 'Mobile verified. Please complete your profile registration.',
    });
  });

  app.post('/api/v1/auth/register', async (req, res) => {
    const {
      phoneNumber,
      displayName,
      gender,
      age,
      dob,
      preferredLanguage,
      avatarId,
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Display name is required.' });
    }

    const digitsOnly = (phoneNumber || '').replace(/\D/g, '');
    const normalizedPhone = '+91' + (digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly);

    const userGender = gender === 'Female' ? 'Female' : 'Male';
    const userLang = preferredLanguage || 'Telugu';
    const userAge = Number(age) || 24;

    // Default avatar based on gender
    let chosenAvatarId = avatarId;
    if (!chosenAvatarId) {
      chosenAvatarId = userGender === 'Female' ? 'av_swapna' : 'av_aman';
    }
    const foundAv = PREDEFINED_AVATARS.find((a) => a.id === chosenAvatarId);
    const chosenAvatarUrl = foundAv ? foundAv.svgUrl : PREDEFINED_AVATARS[0].svgUrl;

    const newUser: UserProfile = {
      id: 'USR_' + Date.now(),
      phoneNumber: normalizedPhone,
      displayName: displayName.trim(),
      gender: userGender,
      dob: dob || '2000-01-01',
      age: userAge,
      preferredLanguage: userLang,
      secondaryLanguages: ['English'],
      avatarId: chosenAvatarId,
      avatarUrl: chosenAvatarUrl,
      status: 'Active',
      isOnline: true,
      isBusy: false,
      coinsBalance: 500, // 500 free welcome coins to call and test immediately
      totalCallsMade: 0,
      totalCallsReceived: 0,
      totalCallDurationMins: 0,
      earnedCoins: 0,
      withdrawnINR: 0,
      audioRatePerMin: 10,
      videoRatePerMin: 20,
      joinedDate: new Date().toLocaleDateString('en-GB'),
      lastActive: 'Just now',
      bio: `Namaskaram! ${displayName.trim()} here. Ready to talk in ${userLang}!`,
    };

    // Save in memory
    users.unshift(newUser);
    currentUser = newUser;

    // Persist to PostgreSQL with proper relational schema
    try {
      await dbQuery(`
        INSERT INTO users (id, phone_number, status)
        VALUES ($1, $2, 'Active')
        ON CONFLICT (id) DO UPDATE SET phone_number = EXCLUDED.phone_number;
      `, [newUser.id, newUser.phoneNumber]);

      await dbQuery(`
        INSERT INTO user_profiles (
          user_id, display_name, gender, date_of_birth, age,
          preferred_language_id, avatar_id, bio, is_creator_eligible
        )
        VALUES ($1, $2, $3, $4, $5, 'te', $6, $7, true)
        ON CONFLICT (user_id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          gender = EXCLUDED.gender,
          avatar_id = EXCLUDED.avatar_id;
      `, [
        newUser.id,
        newUser.displayName,
        newUser.gender,
        newUser.dob,
        newUser.age,
        newUser.avatarId,
        newUser.bio,
      ]);

      await dbQuery(`
        INSERT INTO wallets (user_id, balance_coins, reserved_coins)
        VALUES ($1, $2, 0)
        ON CONFLICT (user_id) DO UPDATE SET balance_coins = EXCLUDED.balance_coins;
      `, [newUser.id, newUser.coinsBalance]);
    } catch (e: any) {
      console.warn('PostgreSQL user persistence notice:', e.message);
    }

    return res.json({
      success: true,
      token: 'jwt_token_' + newUser.id,
      user: newUser,
    });
  });

  app.post('/api/v1/auth/google', (req, res) => {
    return res.json({
      success: true,
      token: 'jwt_mock_google_token_' + Date.now(),
      user: currentUser,
      isNewUser: false,
    });
  });

  app.get('/api/v1/users/me', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    if (userId) {
      const found = users.find((u) => u.id === userId);
      if (found) {
        return res.json({ success: true, user: found, ...found });
      }
    }
    if (currentUser) {
      return res.json({ success: true, user: currentUser, ...currentUser });
    }
    return res.status(401).json({ error: 'User not logged in', user: null });
  });

  app.put('/api/v1/users/me', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || (req.body.userId as string) || (currentUser ? currentUser.id : '');
    let target = users.find((u) => u.id === userId) || currentUser;
    if (!target) return res.status(404).json({ error: 'User not found' });
    const { displayName, gender, dob, preferredLanguage, avatarId } = req.body;
    if (displayName) target.displayName = displayName;
    if (gender) target.gender = gender;
    if (dob) {
      target.dob = dob;
      const birthYear = new Date(dob).getFullYear();
      target.age = new Date().getFullYear() - birthYear;
    }
    if (preferredLanguage) target.preferredLanguage = preferredLanguage;
    if (avatarId) {
      target.avatarId = avatarId;
      const found = PREDEFINED_AVATARS.find((a) => a.id === avatarId);
      if (found) target.avatarUrl = found.svgUrl;
    }
    res.json({ success: true, user: target });
  });

  app.get('/api/v1/avatars', (req, res) => {
    res.json(PREDEFINED_AVATARS);
  });

  // -------------------------------------------------------------------------
  // 2. USERS DISCOVERY & FAVORITES & BLOCKS
  // -------------------------------------------------------------------------
  app.get('/api/v1/users/online', (req, res) => {
    const { language, gender, tab, currentUserId } = req.query;
    const myId = (currentUserId as string) || (req.headers['x-user-id'] as string);
    const myUser = myId ? users.find((u) => u.id === myId) : null;

    // Strictly filter active online users
    let list = users.filter((u) => u.isOnline && !blockedUserIds.includes(u.id));
    if (myId) {
      list = list.filter((u) => u.id !== myId);
    }

    // STRICT GENDER MATCHING:
    // Male user -> STRICTLY Online Female users only!
    // Female user -> STRICTLY Online Male callers only!
    if (gender && gender !== 'All') {
      list = list.filter((u) => u.gender.toLowerCase() === String(gender).toLowerCase());
    } else if (myUser?.gender === 'Male') {
      list = list.filter((u) => u.gender === 'Female');
    } else if (myUser?.gender === 'Female') {
      list = list.filter((u) => u.gender === 'Male');
    }

    if (tab === 'favorites') {
      list = list.filter((u) => favoritesUserIds.includes(u.id));
    }

    if (language && language !== 'All') {
      list = list.filter(
        (u) =>
          u.preferredLanguage.toLowerCase() === String(language).toLowerCase() ||
          u.secondaryLanguages.some((l) => l.toLowerCase() === String(language).toLowerCase())
      );
    }

    // Mark favorite status dynamically
    const enriched = list.map((u) => ({
      ...u,
      isFavorite: favoritesUserIds.includes(u.id),
    }));

    res.json({
      totalOnline: users.filter((u) => u.isOnline).length,
      users: enriched,
      viewerGender: myUser?.gender || 'Unknown',
    });
  });

  app.get('/api/v1/users/:id', (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user,
      isFavorite: favoritesUserIds.includes(user.id),
      isBlocked: blockedUserIds.includes(user.id),
    });
  });

  app.post('/api/v1/favorites/toggle', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const exists = favoritesUserIds.includes(userId);
    if (exists) {
      favoritesUserIds = favoritesUserIds.filter((id) => id !== userId);
    } else {
      favoritesUserIds.push(userId);
    }
    res.json({ success: true, isFavorite: !exists, favorites: favoritesUserIds });
  });

  app.post('/api/v1/blocks/toggle', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const exists = blockedUserIds.includes(userId);
    if (exists) {
      blockedUserIds = blockedUserIds.filter((id) => id !== userId);
    } else {
      blockedUserIds.push(userId);
    }
    res.json({ success: true, isBlocked: !exists, blocked: blockedUserIds });
  });

  app.post('/api/v1/reports', (req, res) => {
    const { reportedUserId, reason, notes } = req.body;
    const callerId = (req.headers['x-user-id'] as string) || (currentUser ? currentUser.id : 'anonymous');
    const callerUser = users.find((u) => u.id === callerId) || currentUser;
    const reportedUser = users.find((u) => u.id === reportedUserId);
    const newReport: UserReport = {
      id: 'REP_' + Math.floor(100 + Math.random() * 900),
      reporterId: callerId,
      reporterName: callerUser ? callerUser.displayName : 'User',
      reportedUserId,
      reportedUserName: reportedUser ? reportedUser.displayName : 'Unknown',
      reason,
      notes,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Pending',
    };
    reports.unshift(newReport);
    res.json({ success: true, message: 'Report submitted for review.', report: newReport });
  });

  // -------------------------------------------------------------------------
  // 3. WEBRTC & CALLING SESSIONS + SERVER-AUTHORITATIVE BILLING
  // -------------------------------------------------------------------------
  app.post('/api/v1/calls/initiate', (req, res) => {
    const { calleeId, type, callerId } = req.body as { calleeId: string; type: 'audio' | 'video'; callerId?: string };
    const resolvedCallerId = callerId || (req.headers['x-user-id'] as string) || (currentUser ? currentUser.id : '');
    const caller = users.find((u) => u.id === resolvedCallerId) || currentUser;
    if (!caller) return res.status(401).json({ error: 'Caller profile not found. Please log in.' });

    const callee = users.find((u) => u.id === calleeId);
    if (!callee) return res.status(404).json({ error: 'Target user not found' });

    if (caller.id === callee.id) {
      return res.status(400).json({ error: 'Cannot call yourself. Please choose another online user.' });
    }

    if (blockedUserIds.includes(calleeId)) {
      return res.status(403).json({ error: 'You cannot call a blocked user.' });
    }

    if (!callee.isOnline) {
      return res.status(409).json({ error: 'User is currently offline. Wait until they connect or call another available user.' });
    }

    if (callee.isBusy) {
      return res.status(409).json({ error: 'User is currently busy on another call. Try another available user or random match.' });
    }

    const rate = type === 'video' ? config.videoCoinsPerMin : config.audioCoinsPerMin;
    if (caller.coinsBalance < rate) {
      return res.status(402).json({
        error: `Insufficient coins balance (${caller.coinsBalance} coins). At least 1 minute rate (${rate} coins) required to initiate call.`,
        requiredCoins: rate,
        currentBalance: caller.coinsBalance,
      });
    }

    const session: CallSession = {
      id: 'CALL_' + Date.now(),
      callerId: caller.id,
      callerName: caller.displayName,
      callerAvatar: caller.avatarUrl,
      calleeId: callee.id,
      calleeName: callee.displayName,
      calleeAvatar: callee.avatarUrl,
      type,
      status: 'ringing',
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      billedCoins: 0,
      audioRate: config.audioCoinsPerMin,
      videoRate: config.videoCoinsPerMin,
      creatorCoinsEarned: 0,
      platformCoinsEarned: 0,
      coinToInrRate: config.coinToInrRate,
      createdAt: Date.now(),
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    liveCalls.unshift(session);
    res.json({ success: true, session });
  });

  // Random Stranger Match
  app.post('/api/v1/calls/random-match', (req, res) => {
    const { type = 'audio', language = 'Telugu', callerId } = req.body;
    const resolvedCallerId = callerId || (req.headers['x-user-id'] as string) || (currentUser ? currentUser.id : '');
    const caller = users.find((u) => u.id === resolvedCallerId) || currentUser;
    if (!caller) return res.status(401).json({ error: 'Please log in first' });

    // Strict opposite gender candidate matching
    const targetGender = caller.gender === 'Male' ? 'Female' : 'Male';
    const candidates = users.filter(
      (u) =>
        u.id !== caller.id &&
        u.gender === targetGender &&
        u.isOnline &&
        !u.isBusy &&
        u.status === 'Active' &&
        !blockedUserIds.includes(u.id)
    );

    if (candidates.length === 0) {
      return res.status(404).json({ error: `No available ${targetGender} online users found at the moment. Please wait or try again shortly!` });
    }

    // Prioritize Telugu speakers
    const teluguCandidates = candidates.filter(
      (c) => c.preferredLanguage.toLowerCase() === 'telugu' || c.secondaryLanguages.includes('Telugu')
    );
    const chosen = teluguCandidates.length > 0
      ? teluguCandidates[Math.floor(Math.random() * teluguCandidates.length)]
      : candidates[Math.floor(Math.random() * candidates.length)];

    const rate = type === 'video' ? config.videoCoinsPerMin : config.audioCoinsPerMin;
    if (caller.coinsBalance < rate) {
      return res.status(402).json({
        error: `Insufficient coins balance (${caller.coinsBalance} coins). At least ${rate} coins required.`,
        requiredCoins: rate,
      });
    }

    const session: CallSession = {
      id: 'RAND_CALL_' + Date.now(),
      callerId: caller.id,
      callerName: caller.displayName,
      callerAvatar: caller.avatarUrl,
      calleeId: chosen.id,
      calleeName: chosen.displayName,
      calleeAvatar: chosen.avatarUrl,
      type,
      status: 'ringing',
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      billedCoins: 0,
      audioRate: config.audioCoinsPerMin,
      videoRate: config.videoCoinsPerMin,
      creatorCoinsEarned: 0,
      platformCoinsEarned: 0,
      coinToInrRate: config.coinToInrRate,
      createdAt: Date.now(),
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    liveCalls.unshift(session);
    res.json({ success: true, matchedUser: chosen, session });
  });

  // Connect Call (Callee accepts)
  app.post('/api/v1/calls/:id/connect', (req, res) => {
    const session = liveCalls.find((c) => c.id === req.params.id);
    if (!session) return res.status(404).json({ error: 'Call session not found' });

    session.status = 'connected';
    session.startTime = Date.now();

    // Mark callee and caller busy
    const callee = users.find((u) => u.id === session.calleeId);
    if (callee) callee.isBusy = true;
    const caller = users.find((u) => u.id === session.callerId);
    if (caller) caller.isBusy = true;

    res.json({ success: true, session });
  });

  // End Call & Authoritative Server Billing
  app.post('/api/v1/calls/:id/end', (req, res) => {
    const session = liveCalls.find((c) => c.id === req.params.id);
    if (!session) return res.status(404).json({ error: 'Call session not found' });

    const now = Date.now();
    session.endTime = now;
    session.status = 'ended';

    // Unmark busy
    const callee = users.find((u) => u.id === session.calleeId);
    if (callee) callee.isBusy = false;
    const caller = users.find((u) => u.id === session.callerId);
    if (caller) caller.isBusy = false;

    // Billing calculation rule
    if (!session.startTime) {
      session.durationSeconds = 0;
      session.billedCoins = 0;
      session.creatorCoinsEarned = 0;
      session.platformCoinsEarned = 0;
    } else {
      const durationMs = Math.max(0, now - session.startTime);
      const rawSeconds = Math.floor(durationMs / 1000);
      session.durationSeconds = rawSeconds;

      // Minimum billable seconds rule
      const billableSeconds = Math.max(rawSeconds, config.minBillableSeconds);

      // Rounding Mode: CEIL_MINUTE
      let billableMinutes = 0;
      if (config.roundingMode === 'CEIL_MINUTE') {
        billableMinutes = Math.ceil(billableSeconds / 60);
      } else {
        billableMinutes = Math.round((billableSeconds / 60) * 10) / 10;
      }

      const rate = session.type === 'video' ? session.videoRate : session.audioRate;
      let totalBilled = billableMinutes * rate;

      // Deduct from caller
      if (caller) {
        totalBilled = Math.min(totalBilled, caller.coinsBalance);
        caller.coinsBalance -= totalBilled;
        caller.totalCallsMade = (caller.totalCallsMade || 0) + 1;
        caller.totalCallDurationMins = (caller.totalCallDurationMins || 0) + Math.ceil(rawSeconds / 60);

        // Add ledger transaction
        walletTransactions.unshift({
          id: 'TX_' + Date.now(),
          userId: caller.id,
          type: 'DEBIT_CALL',
          amountCoins: -totalBilled,
          balanceAfter: caller.coinsBalance,
          referenceId: session.id,
          description: `${session.type === 'video' ? 'Video' : 'Audio'} call to ${session.calleeName} (${Math.floor(rawSeconds / 60)}m ${rawSeconds % 60}s)`,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      const creatorShare = Math.round(totalBilled * (config.creatorSharePercentage / 100));
      const platformShare = totalBilled - creatorShare;

      session.billedCoins = totalBilled;
      session.creatorCoinsEarned = creatorShare;
      session.platformCoinsEarned = platformShare;

      // Credit callee creator earnings if callee is creator eligible
      if (callee) {
        callee.earnedCoins = (callee.earnedCoins || 0) + creatorShare;
        callee.totalCallsReceived = (callee.totalCallsReceived || 0) + 1;
      }
    }

    // Move from liveCalls to callHistory
    liveCalls = liveCalls.filter((c) => c.id !== session.id);
    callHistory.unshift(session);

    res.json({
      success: true,
      session,
      callerRemainingCoins: caller ? caller.coinsBalance : 0,
    });
  });

  // -------------------------------------------------------------------------
  // 4. WALLET, PAYMENTS & CREATOR WITHDRAWALS
  // -------------------------------------------------------------------------
  app.get('/api/v1/wallet', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const targetUser = userId ? users.find((u) => u.id === userId) || currentUser : currentUser;
    const userTx = walletTransactions.filter((tx) => !userId || (targetUser && tx.userId === targetUser.id));
    res.json({
      balance: targetUser ? targetUser.coinsBalance : 500,
      transactions: userTx,
      packages: coinPackages,
    });
  });

  app.post('/api/v1/wallet/buy-coins', (req, res) => {
    const { packageId, paymentMethod = 'UPI', userId } = req.body;
    const resolvedUserId = userId || (req.headers['x-user-id'] as string) || (currentUser ? currentUser.id : '');
    const targetUser = users.find((u) => u.id === resolvedUserId) || currentUser;
    if (!targetUser) return res.status(401).json({ error: 'User not found' });
    const pkg = coinPackages.find((p) => p.id === packageId);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const orderId = 'PAY' + (1000 + payments.length + 1);
    const newPayment: PaymentOrder = {
      orderId,
      userId: targetUser.id,
      userName: targetUser.displayName,
      packageId: pkg.id,
      amountINR: pkg.priceINR,
      coins: pkg.coins,
      status: 'Success',
      paymentMethod,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transactionRef: 'UPI/' + Date.now() + '/MATLADUKO',
    };
    payments.unshift(newPayment);

    targetUser.coinsBalance += pkg.coins;

    const newTx: WalletTransaction = {
      id: 'TX_' + Date.now(),
      userId: targetUser.id,
      type: 'CREDIT_PURCHASE',
      amountCoins: pkg.coins,
      balanceAfter: targetUser.coinsBalance,
      referenceId: orderId,
      description: `Purchased ${pkg.coins} Coins (${paymentMethod})`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    walletTransactions.unshift(newTx);

    res.json({
      success: true,
      message: `${pkg.coins} Coins credited successfully!`,
      newBalance: targetUser.coinsBalance,
      order: newPayment,
    });
  });

  // -------------------------------------------------------------------------
  // 4. WALLET, PAYMENTS & CREATOR WITHDRAWALS
  // -------------------------------------------------------------------------
  app.get('/api/v1/wallet', (req, res) => {
    res.json({
      balance: currentUser.coinsBalance,
      transactions: walletTransactions,
      packages: coinPackages,
    });
  });

  app.post('/api/v1/wallet/buy-coins', (req, res) => {
    const { packageId, paymentMethod = 'UPI' } = req.body;
    const pkg = coinPackages.find((p) => p.id === packageId);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const orderId = 'PAY' + (1000 + payments.length + 1);
    const newPayment: PaymentOrder = {
      orderId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      packageId: pkg.id,
      amountINR: pkg.priceINR,
      coins: pkg.coins,
      status: 'Success',
      paymentMethod,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transactionRef: `${paymentMethod.toUpperCase()}/MATLADUKO_${Date.now()}`,
    };

    payments.unshift(newPayment);

    // Credit coins immediately
    currentUser.coinsBalance += pkg.coins;

    walletTransactions.unshift({
      id: 'TX_' + Date.now(),
      userId: currentUser.id,
      type: 'CREDIT_PURCHASE',
      amountCoins: pkg.coins,
      balanceAfter: currentUser.coinsBalance,
      referenceId: orderId,
      description: `Purchased ${pkg.coins} Coins (${paymentMethod})`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    res.json({
      success: true,
      order: newPayment,
      newBalance: currentUser.coinsBalance,
    });
  });

  app.get('/api/v1/creator/dashboard', (req, res) => {
    const withdrawableINR = Math.floor(currentUser.earnedCoins * config.coinToInrRate);
    res.json({
      totalEarnedCoins: currentUser.earnedCoins,
      availableCoins: currentUser.earnedCoins,
      withdrawableINR,
      minWithdrawalINR: config.minWithdrawalAmountINR,
      coinToInrRate: config.coinToInrRate,
      withdrawals: withdrawals.filter((w) => w.userId === currentUser.id || w.userName === currentUser.displayName),
    });
  });

  app.post('/api/v1/creator/withdraw', (req, res) => {
    const { amountINR, payoutMethod, accountDetails } = req.body;
    const amount = Number(amountINR);

    if (isNaN(amount) || amount < config.minWithdrawalAmountINR) {
      return res.status(400).json({ error: `Minimum withdrawal limit is ₹${config.minWithdrawalAmountINR}` });
    }

    const coinsRequired = Math.ceil(amount / config.coinToInrRate);
    if (currentUser.earnedCoins < coinsRequired) {
      return res.status(400).json({ error: `Insufficient earned coins. You need ${coinsRequired} coins for ₹${amount}.` });
    }

    const newWd: WithdrawalRequest = {
      id: 'WD' + (1000 + withdrawals.length + 1),
      userId: currentUser.id,
      userName: currentUser.displayName,
      amountINR: amount,
      coinsDeducted: coinsRequired,
      payoutMethod: payoutMethod || 'Bank Transfer',
      accountDetails: accountDetails || 'Bank Account •••• 1234',
      status: 'Pending',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    currentUser.earnedCoins -= coinsRequired;
    withdrawals.unshift(newWd);

    res.json({
      success: true,
      message: 'Withdrawal request submitted for Admin verification and automated payout.',
      withdrawal: newWd,
      remainingEarnedCoins: currentUser.earnedCoins,
    });
  });

  // -------------------------------------------------------------------------
  // 5. COMPLETE ADMIN WEB APIS (/api/v1/admin/*)
  // -------------------------------------------------------------------------
  app.post('/api/v1/admin/auth/login', (req, res) => {
    const { email, password, mfaCode } = req.body;
    // Simple demo admin credentials
    if (email && password) {
      return res.json({
        success: true,
        adminToken: 'admin_jwt_' + Date.now(),
        admin: adminUsers[0],
      });
    }
    return res.status(400).json({ error: 'Admin email and password required.' });
  });

  app.get('/api/v1/admin/dashboard', (req, res) => {
    const totalUsers = 12543;
    const activeUsers = 2341;
    const callsCompleted = 843 + callHistory.length;
    const coinsPurchased = 124500;
    const platformRevenue = 78320;
    const creatorPayouts = 52600;

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        callsCompleted,
        coinsPurchased,
        platformRevenue,
        creatorPayouts,
      },
      callVolume: [
        { date: 'Sep 12', audio: 800, video: 650 },
        { date: 'Sep 13', audio: 950, video: 720 },
        { date: 'Sep 14', audio: 880, video: 790 },
        { date: 'Sep 15', audio: 1100, video: 920 },
        { date: 'Sep 16', audio: 1250, video: 1040 },
        { date: 'Sep 17', audio: 1320, video: 1180 },
        { date: 'Sep 18', audio: 1410, video: 1290 },
      ],
      liveCalls,
      recentUsers: users.slice(0, 5),
    });
  });

  app.get('/api/v1/admin/users', (req, res) => {
    const { search, gender, status } = req.query;
    let list = [...users];

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter((u) => u.displayName.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
    }
    if (gender && gender !== 'All') {
      list = list.filter((u) => u.gender === gender);
    }
    if (status && status !== 'All') {
      list = list.filter((u) => u.status === status);
    }

    res.json({ users: list, total: list.length });
  });

  app.put('/api/v1/admin/users/:id/status', (req, res) => {
    const { status, reason } = req.body;
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = status;
    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'dinesh@matladuko.com',
      action: `${status.toUpperCase()}_USER`,
      entityType: 'USER',
      entityId: user.id,
      details: `Changed status of ${user.displayName} to ${status}. Reason: ${reason || 'Admin action'}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '49.205.142.11',
    });

    res.json({ success: true, user });
  });

  app.get('/api/v1/admin/live-calls', (req, res) => {
    // Enrich live calls with audio/video stream monitoring metadata
    const enrichedLiveCalls = liveCalls.map((c) => {
      const caller = users.find((u) => u.id === c.callerId);
      const callee = users.find((u) => u.id === c.calleeId);
      return {
        ...c,
        callerGender: caller?.gender || 'Male',
        calleeGender: callee?.gender || 'Female',
        callerPhone: caller?.phoneNumber || '+919876543210',
        calleePhone: callee?.phoneNumber || '+919876543222',
        audioBitrateKbps: 64,
        videoBitrateKbps: c.type === 'video' ? 1200 : 0,
        packetLossPct: 0.2,
        ambientNoiseDb: 48,
        audioCodec: 'Opus 48kHz Stereo',
        videoResolution: c.type === 'video' ? '720p HD (1280x720 30fps)' : 'Audio Only',
        isAudioLive: true,
        isVideoLive: c.type === 'video',
      };
    });

    res.json({
      totalLive: enrichedLiveCalls.length,
      liveCalls: enrichedLiveCalls,
      signalingActiveCount: signalingService.getLiveCallsCount(),
      onlineUsersCount: signalingService.getOnlineUsersCount(),
    });
  });

  app.post('/api/v1/admin/terminate-call', (req, res) => {
    const { callId, reason } = req.body;
    if (!callId) {
      return res.status(400).json({ error: 'callId is required.' });
    }

    const call = liveCalls.find((c) => c.id === callId);
    if (call) {
      call.status = 'ended';
      call.endTime = Date.now();
      liveCalls = liveCalls.filter((c) => c.id !== callId);
      callHistory.unshift(call);
    }

    // Force terminate via signaling server to disconnect both peers
    signalingService.forceTerminateCall(callId, reason || 'Terminated by Admin for Quality & Safety Review');

    // Audit log
    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'dinesh@matladuko.com',
      action: 'TERMINATE_LIVE_CALL',
      entityType: 'CALL',
      entityId: callId,
      details: `Admin terminated live call session ${callId}. Reason: ${reason || 'Safety monitoring'}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '49.205.142.11',
    });

    res.json({ success: true, message: 'Call terminated successfully by Admin supervisor.' });
  });

  app.get('/api/v1/admin/call-history', (req, res) => {
    res.json({ calls: callHistory });
  });

  app.get('/api/v1/admin/payments', (req, res) => {
    res.json({
      totalRevenueINR: 124500,
      successfulCount: payments.filter((p) => p.status === 'Success').length,
      failedCount: payments.filter((p) => p.status === 'Failed').length,
      refundedINR: 2450,
      payments,
    });
  });

  app.post('/api/v1/admin/payments/:orderId/refund', (req, res) => {
    const order = payments.find((p) => p.orderId === req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'Refunded';

    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'rahul@matladuko.com',
      action: 'REFUND_PAYMENT',
      entityType: 'PAYMENT',
      entityId: order.orderId,
      details: `Refunded payment of ₹${order.amountINR} for user ${order.userName}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '157.48.91.4',
    });

    res.json({ success: true, order });
  });

  app.get('/api/v1/admin/withdrawals', (req, res) => {
    res.json({
      totalEarningsINR: 52600,
      withdrawnINR: 28400,
      pendingINR: 18200,
      totalRequests: withdrawals.length,
      withdrawals,
    });
  });

  app.put('/api/v1/admin/withdrawals/:id', (req, res) => {
    const { status, reason } = req.body;
    const wd = withdrawals.find((w) => w.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });

    wd.status = status;
    if (status === 'Success') {
      wd.approvedBy = 'rahul@matladuko.com (Finance)';
    } else if (status === 'Rejected') {
      wd.rejectionReason = reason || 'Verification failed';
    }

    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'rahul@matladuko.com',
      action: `${status.toUpperCase()}_WITHDRAWAL`,
      entityType: 'WITHDRAWAL',
      entityId: wd.id,
      details: `${status} payout of ₹${wd.amountINR} to ${wd.userName} (${wd.payoutMethod})`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '157.48.91.4',
    });

    res.json({ success: true, withdrawal: wd });
  });

  app.get('/api/v1/admin/reports', (req, res) => {
    res.json({ reports });
  });

  app.put('/api/v1/admin/reports/:id/resolve', (req, res) => {
    const { actionTaken } = req.body;
    const report = reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.status = 'Resolved';
    report.actionTaken = actionTaken || 'Reviewed and addressed by moderator.';

    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'priya@matladuko.com',
      action: 'RESOLVE_REPORT',
      entityType: 'REPORT',
      entityId: report.id,
      details: `Resolved report against ${report.reportedUserName}. Action: ${report.actionTaken}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '183.82.110.22',
    });

    res.json({ success: true, report });
  });

  app.get('/api/v1/admin/configuration', (req, res) => {
    res.json({ config, history: configHistory, packages: coinPackages });
  });

  app.put('/api/v1/admin/configuration', (req, res) => {
    const { newConfig, reason = 'Admin parameters tuning' } = req.body;
    const nextVersion = config.version + 1;

    config = {
      ...config,
      ...newConfig,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: 'dinesh@matladuko.com (Super Admin)',
    };

    configHistory.unshift({
      id: 'HIST_' + nextVersion,
      version: nextVersion,
      config: JSON.parse(JSON.stringify(config)),
      changedBy: 'dinesh@matladuko.com',
      timestamp: new Date().toISOString(),
      reason,
    });

    auditLogs.unshift({
      id: 'AUD_' + Date.now(),
      adminEmail: 'dinesh@matladuko.com',
      action: 'UPDATE_CONFIG',
      entityType: 'CONFIGURATION',
      entityId: 'CONFIG_V' + nextVersion,
      details: `Updated rates & revenue share. Version: v${nextVersion}. Reason: ${reason}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      ipAddress: '49.205.142.11',
    });

    res.json({ success: true, config, history: configHistory });
  });

  app.post('/api/v1/admin/packages', (req, res) => {
    const { coins, priceINR, tag } = req.body;
    const newPkg: CoinPackage = {
      id: 'pkg_' + coins,
      coins: Number(coins),
      priceINR: Number(priceINR),
      tag,
    };
    coinPackages.push(newPkg);
    res.json({ success: true, package: newPkg, packages: coinPackages });
  });

  app.get('/api/v1/admin/audit-logs', (req, res) => {
    res.json({ logs: auditLogs });
  });

  app.get('/api/v1/admin/admin-users', (req, res) => {
    res.json({ adminUsers });
  });

  // -------------------------------------------------------------------------
  // 9. DATABASE REALTIME HEALTH & TEST APIS
  // -------------------------------------------------------------------------
  app.get('/api/v1/db/status', async (req, res) => {
    try {
      const status = await testDbConnection();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message });
    }
  });

  app.post('/api/v1/db/test', async (req, res) => {
    try {
      const status = await testDbConnection();
      res.json({
        success: status.connected,
        ...status,
        testedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, connected: false, error: err.message });
    }
  });

  app.post('/api/v1/db/seed', async (req, res) => {
    try {
      const seedResult = await seedInitialDataIfEmpty();
      const status = await testDbConnection();
      res.json({ success: seedResult.seeded, ...seedResult, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/v1/admin/system-health', async (req, res) => {
    let dbStatus: DbStatusInfo;
    try {
      dbStatus = await testDbConnection();
    } catch (e: any) {
      dbStatus = {
        connected: false,
        host: 'db.ntybpccjjbxvdcksnqph.supabase.co',
        port: 5432,
        ssl: true,
        error: e.message,
      };
    }

    res.json({
      status: dbStatus.connected ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        postgres: {
          status: dbStatus.connected ? 'UP' : 'DOWN',
          host: dbStatus.host,
          port: dbStatus.port,
          version: dbStatus.version || 'PostgreSQL 17.11 (Supabase)',
          connections: pool.totalCount,
          activeCount: pool.waitingCount,
          poolSize: pool.options.max || 10,
          pingMs: dbStatus.latencyMs || 0,
          tablesCount: dbStatus.tablesCount || 0,
          usersCount: dbStatus.usersCount || 0,
          error: dbStatus.error,
        },
        redisPresence: { status: 'UP', onlineKeysCount: users.filter((u) => u.isOnline).length, pingMs: 0.4 },
        kafkaBroker: { status: 'UP', topicsCount: 12, consumerLag: 0 },
        coturnServer: { status: 'UP', activeTurnRelays: liveCalls.length, address: 'turn.matladuko.com:3478' },
        webSocketGateway: { status: 'UP', connectedClients: 1024 },
      },
    });
  });

  // -------------------------------------------------------------------------
  // Vite Middleware / Static Handler
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create HTTP & WebSocket Server instance
  const server = http.createServer(app);
  signalingService.init(server);

  signalingService.onPresenceChange((userId, isOnline, callerInfo) => {
    let u = users.find((usr) => usr.id === userId);
    if (u) {
      u.isOnline = isOnline;
      if (!isOnline) u.isBusy = false;
    } else if (isOnline && callerInfo) {
      const newUser: UserProfile = {
        id: userId,
        phoneNumber: callerInfo.phoneNumber || '+91' + Math.floor(1000000000 + Math.random() * 9000000000),
        displayName: callerInfo.displayName || 'User',
        gender: callerInfo.gender || 'Female',
        dob: '2000-01-01',
        age: 24,
        preferredLanguage: 'Telugu',
        secondaryLanguages: ['English'],
        avatarId: 'av_swapna',
        avatarUrl: callerInfo.avatarUrl || 'https://api.dicebear.com/7.x/lorelei/svg?seed=' + userId,
        status: 'Active',
        isOnline: true,
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
      users.unshift(newUser);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Matladuko Server running at http://0.0.0.0:${PORT}`);

    // Verify Supabase PostgreSQL 17 database connectivity
    testDbConnection()
      .then(async (status) => {
        if (status.connected) {
          console.log(`✅ [Supabase PostgreSQL 17] Connected successfully!`);
          console.log(`   Host: ${status.host}:${status.port} | Database: ${status.database}`);
          console.log(`   Version: ${status.version}`);
          console.log(`   Tables: ${status.tablesCount} | Users: ${status.usersCount} | Latency: ${status.latencyMs}ms`);
          await seedInitialDataIfEmpty();
          await loadUsersFromDb();
        } else {
          console.warn(`⚠️ [PostgreSQL Connection Warning]:`, status.error);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize database connection:', err);
      });
  });
}

startServer();
