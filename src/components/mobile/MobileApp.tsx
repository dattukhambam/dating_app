import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Shield,
  Search,
  Filter,
  Star,
  Users,
  CreditCard,
  Clock,
  User,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Wallet,
  TrendingUp,
  Ban,
  Flag,
  Globe,
  Plus,
  Coins,
  Check,
  X,
  Shuffle,
  Headphones,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, CallSession, CoinPackage, PredefinedAvatar } from '../../types';
import { PREDEFINED_AVATARS } from '../../data/avatars';
import { soundEffects } from '../../utils/audioEffects';
import { STRINGS_TE, STRINGS_EN, LanguageStrings } from '../../utils/i18n';
import {
  INITIAL_USERS,
  INITIAL_CURRENT_USER,
  INITIAL_SWAPNA_USER,
  INITIAL_COIN_PACKAGES,
  INITIAL_CALL_HISTORY
} from '../../data/mockDatabase';
import { CallNoiseBanner, CallAudioStatusPill, AudioSettingsModal } from './CallNoiseWarning';
import { RealtimeCallWaveform } from './RealtimeCallWaveform';
import { MatladukoWebRtcManager } from '../../utils/webrtcClient';
import { apiFetch } from '../../utils/apiConfig';

interface MobileAppProps {
  initialUser?: UserProfile | null;
  onRefreshData?: () => void;
  lang?: 'te' | 'en';
  onToggleLang?: () => void;
  onOpenAdmin?: () => void;
}

type MobileScreen =
  | 'splash'
  | 'login'
  | 'otp'
  | 'profile_setup'
  | 'online_users'
  | 'favorites'
  | 'incoming_call'
  | 'video_call'
  | 'audio_call'
  | 'call_ended'
  | 'buy_coins'
  | 'wallet'
  | 'earnings'
  | 'profile_menu'
  | 'call_history'
  | 'blocked_users';

export const MobileApp: React.FC<MobileAppProps> = ({
  initialUser,
  onRefreshData,
  lang = 'te',
  onToggleLang,
  onOpenAdmin,
}) => {
  const strings = lang === 'te' ? STRINGS_TE : STRINGS_EN;

  // Real-time Authentication & Session State
  const getStoredUser = (): UserProfile => {
    try {
      const stored = localStorage.getItem('matladuko_user_profile') || sessionStorage.getItem('matladuko_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id === 'USR_RAHUL' || parsed.id === 'USR_SWAPNA' || parsed.id?.startsWith('USR100')) {
          localStorage.removeItem('matladuko_user_profile');
          localStorage.removeItem('matladuko_user_logged_in');
          sessionStorage.removeItem('matladuko_user_profile');
          sessionStorage.removeItem('matladuko_user_logged_in');
        } else if (parsed.id && parsed.phoneNumber) {
          return parsed;
        }
      }
    } catch {}
    return {
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
    };
  };

  const isPreviouslyLoggedIn = typeof window !== 'undefined' && Boolean(
    (localStorage.getItem('matladuko_user_logged_in') === 'true' || sessionStorage.getItem('matladuko_user_logged_in') === 'true') &&
    getStoredUser().id &&
    getStoredUser().phoneNumber
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isPreviouslyLoggedIn);
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>(isPreviouslyLoggedIn ? 'online_users' : 'login');
  const [user, setUser] = useState<UserProfile>(getStoredUser);

  // Online users & filters
  const [onlineList, setOnlineList] = useState<UserProfile[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserProfile | null>(null);

  // Auth flow states
  const [inputPhone, setInputPhone] = useState('+91');
  const [defaultOtpHint, setDefaultOtpHint] = useState('123456');
  const [otpDigits, setOtpDigits] = useState(['1', '2', '3', '4', '5', '6']);
  const [otpTimer, setOtpTimer] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Profile setup state
  const [setupName, setSetupName] = useState(user.displayName);
  const [setupGender, setSetupGender] = useState<'Male' | 'Female' | 'Other'>(user.gender);
  const [setupDob, setSetupDob] = useState(user.dob || '2000-03-15');
  const [setupLang, setSetupLang] = useState(user.preferredLanguage || 'Telugu');
  const [setupAvatarId, setSetupAvatarId] = useState(user.avatarId || PREDEFINED_AVATARS[0].id);

  // Calling & WebRTC Simulation State
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [lastEndedCall, setLastEndedCall] = useState<CallSession | null>(null);
  const [randomMatchingActive, setRandomMatchingActive] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{
    caller: UserProfile;
    type: 'audio' | 'video';
    sessionId: string;
  } | null>(null);

  // Ambient Noise, Mic Sensitivity & Headphone Detection
  const [isHeadphonesOn, setIsHeadphonesOn] = useState(false);
  const [micSensitivity, setMicSensitivity] = useState<number>(75);
  const [ambientNoiseDb, setAmbientNoiseDb] = useState<number>(46);
  const [isNoiseWarningDismissed, setIsNoiseWarningDismissed] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

  // Coin Purchase & Withdrawal
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Wallet'>('UPI');
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [withdrawMethod, setWithdrawMethod] = useState<'Bank Transfer' | 'UPI'>('UPI');
  const [withdrawNotice, setWithdrawNotice] = useState('');

  // Call history & transactions
  const [callHistoryList, setCallHistoryList] = useState<CallSession[]>([]);
  const [walletTxList, setWalletTxList] = useState<any[]>([]);
  const [blockedUsersList, setBlockedUsersList] = useState<string[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('Harassment');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const callTimerRef = useRef<any>(null);
  const ringTimeoutRef = useRef<any>(null);

  // WebRTC Real-time Media & Signaling States
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const webrtcManagerRef = useRef<MatladukoWebRtcManager | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Bind local video stream whenever it updates or screen switches
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, currentScreen]);

  // Bind remote video stream whenever it updates or screen switches
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, currentScreen]);

  // Initialize WebRTC Signaling connection
  useEffect(() => {
    if (!isLoggedIn || !user.id) return;

    const mgr = new MatladukoWebRtcManager({
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
      },
      onLocalStream: (stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      },
      onIncomingCall: (callData) => {
        soundEffects.startRingtone();
        setIncomingCallData({
          caller: callData.caller,
          type: callData.callType,
          sessionId: callData.callId,
        });
        setCurrentScreen('incoming_call');
      },
      onCallStateChange: (state) => {
        if (state === 'connected') {
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          soundEffects.stopRingtone();
          soundEffects.playConnectChime();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
          setCallDurationSec(0);
          showToast('Live WebRTC P2P Call Connected!');
        } else if (state === 'ended') {
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          soundEffects.stopRingtone();
          soundEffects.playEndChime();
          setRemoteStream(null);
          setLocalStream(null);
          setActiveCall(null);
          setIncomingCallData(null);
          setCurrentScreen('online_users');
          fetchUsers();
        }
      },
      onPresenceUpdate: () => {
        fetchUsers();
      },
      onAudioLevel: (db) => {
        setAmbientNoiseDb(db);
      },
      onError: (errMsg) => {
        showToast(errMsg);
      },
    });

    mgr.connectSignaling(user.id, user.displayName, user.avatarUrl, user.gender);
    webrtcManagerRef.current = mgr;

    return () => {
      mgr.cleanup();
    };
  }, [isLoggedIn, user.id, user.displayName, user.avatarUrl, user.gender]);

  // Fetch real registered online users from backend
  const fetchUsers = async () => {
    try {
      const res = await apiFetch(
        `/api/v1/users/online?language=${languageFilter}&gender=${genderFilter}&tab=${currentScreen === 'favorites' ? 'favorites' : 'all'}&currentUserId=${user.id}`,
        {
          headers: { 'x-user-id': user.id },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setOnlineList(data.users || []);
        return;
      }
    } catch (err) {
      console.warn('Network offline or error fetching online users');
    }
  };

  // Fetch wallet & packages with fallback
  const fetchWallet = async () => {
    try {
      const res = await apiFetch('/api/v1/wallet');
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => ({ ...prev, coinsBalance: data.balance }));
        setWalletTxList(data.transactions || []);
        setCoinPackages(data.packages || []);
        if (data.packages?.length > 0 && !selectedPackage) {
          setSelectedPackage(data.packages[2] || data.packages[0]);
        }
        return;
      }
    } catch (err) {}
    // Fallback
    setCoinPackages(INITIAL_COIN_PACKAGES);
    if (!selectedPackage && INITIAL_COIN_PACKAGES.length > 0) {
      setSelectedPackage(INITIAL_COIN_PACKAGES[2] || INITIAL_COIN_PACKAGES[0]);
    }
  };

  // Fetch history with fallback
  const fetchHistory = async () => {
    try {
      const res = await apiFetch('/api/v1/admin/call-history');
      if (res.ok) {
        const data = await res.json();
        setCallHistoryList(data.calls || []);
        return;
      }
    } catch (err) {}
    setCallHistoryList(INITIAL_CALL_HISTORY);
  };

  useEffect(() => {
    fetchUsers();
    fetchWallet();
    fetchHistory();
  }, [languageFilter, genderFilter, currentScreen]);

  // Periodic polling for online users so 2nd device appears immediately without manual refresh
  useEffect(() => {
    if (!isLoggedIn || !user.id) return;
    const interval = setInterval(() => {
      fetchUsers();
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn, user.id, languageFilter, genderFilter, currentScreen]);

  // Active Presence Heartbeat so server knows user is alive & online
  useEffect(() => {
    if (!isLoggedIn || !user.id) return;
    const sendHeartbeat = () => {
      apiFetch('/api/v1/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const heartbeatTimer = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(heartbeatTimer);
  }, [isLoggedIn, user.id]);

  // High-reliability Signal Polling Fallback (ensures incoming calls never drop across networks)
  useEffect(() => {
    if (!isLoggedIn || !user.id || activeCall) return;
    const signalTimer = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/v1/calls/signals/pending?userId=${user.id}`, {
          headers: { 'x-user-id': user.id },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              if (sig.type === 'CALL_INITIATE' && !incomingCallData && !activeCall) {
                const payload = typeof sig.payload === 'string' ? JSON.parse(sig.payload) : sig.payload;
                soundEffects.startRingtone();
                setIncomingCallData({
                  caller: payload.callerInfo || { id: sig.from_user_id, displayName: 'Telugu Caller' },
                  type: payload.callType || 'video',
                  sessionId: sig.call_id,
                });
                setCurrentScreen('incoming_call');
              } else if (sig.type === 'CALL_OFFER' || sig.type === 'CALL_ANSWER' || sig.type === 'ICE_CANDIDATE') {
                const payload = typeof sig.payload === 'string' ? JSON.parse(sig.payload) : sig.payload;
                webrtcManagerRef.current?.handleExternalSignal({
                  type: sig.type,
                  callId: sig.call_id,
                  targetUserId: sig.to_user_id,
                  userId: sig.from_user_id,
                  ...payload,
                });
              } else if (sig.type === 'CALL_END') {
                soundEffects.stopRingtone();
                soundEffects.playEndChime();
                setRemoteStream(null);
                setLocalStream(null);
                setActiveCall(null);
                setIncomingCallData(null);
                setCurrentScreen('online_users');
              }
            }
          }
        }
      } catch {}
    }, 2500);
    return () => clearInterval(signalTimer);
  }, [isLoggedIn, user.id, activeCall, incomingCallData]);

  // Call timer interval
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Ambient noise threshold: high if noise >= 70dB, or if on speakerphone with mic sensitivity >= 75% and noise >= 62dB
  const isHighNoise =
    !isMuted &&
    !isHeadphonesOn &&
    (ambientNoiseDb >= 70 || (isSpeakerOn && micSensitivity >= 75 && ambientNoiseDb >= 62));

  // Ambient noise and microphone sensitivity simulation & monitoring during calls
  useEffect(() => {
    let noiseInterval: any = null;
    let autoSpikeTimeout: any = null;

    if (activeCall && (currentScreen === 'audio_call' || currentScreen === 'video_call')) {
      noiseInterval = setInterval(() => {
        setAmbientNoiseDb((prev) => {
          if (isMuted) {
            return Math.floor(22 + Math.random() * 6);
          }
          if (isHeadphonesOn) {
            return Math.floor(34 + Math.random() * 8);
          }
          const baseNoise = isSpeakerOn ? 64 : 46;
          const sensitivityBoost = (micSensitivity - 50) * 0.32;
          const randomDrift = (Math.random() - 0.45) * 8;
          return Math.round(Math.min(92, Math.max(30, baseNoise + sensitivityBoost + randomDrift)));
        });
      }, 2500);

      // Natural educational trigger: when on speaker without headphones, simulate high room noise after 4 seconds
      if (!isHeadphonesOn && isSpeakerOn) {
        autoSpikeTimeout = setTimeout(() => {
          setAmbientNoiseDb(76);
          setIsNoiseWarningDismissed(false);
        }, 4000);
      }
    } else {
      setAmbientNoiseDb(46);
      setIsHeadphonesOn(false);
      setIsNoiseWarningDismissed(false);
      setIsAudioSettingsOpen(false);
    }

    return () => {
      if (noiseInterval) clearInterval(noiseInterval);
      if (autoSpikeTimeout) clearTimeout(autoSpikeTimeout);
    };
  }, [activeCall, currentScreen, isMuted, isHeadphonesOn, isSpeakerOn, micSensitivity]);

  const handleWearHeadphones = () => {
    setIsHeadphonesOn(true);
    setAmbientNoiseDb(36);
    setIsNoiseWarningDismissed(true);
    soundEffects.playConnectChime();
    showToast(strings.headphonesActive);
  };

  const handleSimulateNoiseSpike = () => {
    setAmbientNoiseDb(82);
    setIsNoiseWarningDismissed(false);
    setIsHeadphonesOn(false);
    showToast(lang === 'te' ? 'అధిక శబ్దం గుర్తించబడింది (82 dB)' : 'High ambient noise simulated (82 dB)');
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleSendOtp = async () => {
    const rawDigits = inputPhone.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      showToast(lang === 'te' ? 'దయచేసి మీ 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి' : 'Please enter valid 10-digit mobile number');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await apiFetch('/api/v1/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: inputPhone }),
      });
      const data = await res.json();
      const otpCode = data.defaultOtp || data.demoOtp || '123456';
      setDefaultOtpHint(otpCode);
      setOtpDigits(otpCode.split(''));
      showToast(
        lang === 'te'
          ? `OTP పంపబడింది! Default OTP (${otpCode}) ఆటోమేటిక్‌గా నింపబడింది.`
          : `OTP sent! Default OTP (${otpCode}) auto-filled.`
      );
      setCurrentScreen('otp');
      setOtpTimer(30);
    } catch (e) {
      setDefaultOtpHint('123456');
      setOtpDigits(['1', '2', '3', '4', '5', '6']);
      showToast(
        lang === 'te'
          ? 'Default OTP: 123456 ఆటోమేటిక్‌గా నింపబడింది.'
          : 'Default OTP: 123456 auto-filled.'
      );
      setCurrentScreen('otp');
      setOtpTimer(30);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 6) {
      showToast(lang === 'te' ? 'దయచేసి 6 అంకెల OTP ఎంటర్ చేయండి' : 'Please enter 6-digit OTP');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await apiFetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: inputPhone, otp: enteredOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isNewUser) {
          showToast(
            lang === 'te'
              ? 'మొబైల్ నంబర్ వెరిఫై అయింది. దయచేసి మీ ప్రొఫైల్ వివరాలు నమోదు చేయండి.'
              : 'Mobile verified. Please complete your profile registration.'
          );
          setSetupName('');
          setSetupGender('Male');
          setCurrentScreen('profile_setup');
          return;
        }
        if (data.user) {
          setUser(data.user);
          try {
            sessionStorage.setItem('matladuko_user_profile', JSON.stringify(data.user));
            localStorage.setItem('matladuko_user_profile', JSON.stringify(data.user));
            sessionStorage.setItem('matladuko_user_logged_in', 'true');
          } catch {}
          setIsLoggedIn(true);
          showToast(
            lang === 'te'
              ? `స్వాగతం ${data.user.displayName}! లాగిన్ అయ్యారు.`
              : `Welcome ${data.user.displayName}! Logged in successfully.`
          );
          setCurrentScreen('online_users');
          if (onRefreshData) onRefreshData();
        }
      } else {
        showToast(data.error || 'Invalid OTP');
      }
    } catch (e) {
      // Local fallback for offline APK
      const stored = localStorage.getItem('matladuko_user_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.phoneNumber === inputPhone) {
            setUser(parsed);
            setIsLoggedIn(true);
            setCurrentScreen('online_users');
            return;
          }
        } catch {}
      }
      setSetupName('');
      setSetupGender('Male');
      setCurrentScreen('profile_setup');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!setupName || !setupName.trim()) {
      showToast(lang === 'te' ? 'దయచేసి మీ పేరు రాయండి' : 'Please enter your display name');
      return;
    }
    try {
      const selectedAv = PREDEFINED_AVATARS.find((a) => a.id === setupAvatarId) || PREDEFINED_AVATARS[0];
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: inputPhone,
          displayName: setupName.trim(),
          gender: setupGender,
          dob: setupDob,
          preferredLanguage: setupLang,
          avatarId: setupAvatarId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        try {
          sessionStorage.setItem('matladuko_user_profile', JSON.stringify(data.user));
          localStorage.setItem('matladuko_user_profile', JSON.stringify(data.user));
          sessionStorage.setItem('matladuko_user_logged_in', 'true');
        } catch {}
        setIsLoggedIn(true);
        showToast(
          lang === 'te'
            ? `రిజిస్ట్రేషన్ పూర్తయింది! స్వాగతం ${data.user.displayName}.`
            : `Registration complete! Welcome ${data.user.displayName}.`
        );
        setCurrentScreen('online_users');
        if (onRefreshData) onRefreshData();
        return;
      }
    } catch (e) {}

    // Offline / Standalone Fallback
    const selectedAv = PREDEFINED_AVATARS.find((a) => a.id === setupAvatarId) || PREDEFINED_AVATARS[0];
    const newUser: UserProfile = {
      id: 'USR_' + Date.now(),
      phoneNumber: inputPhone,
      displayName: setupName.trim(),
      gender: setupGender as any,
      dob: setupDob,
      age: 24,
      preferredLanguage: setupLang,
      secondaryLanguages: ['English'],
      avatarId: setupAvatarId,
      avatarUrl: selectedAv.svgUrl,
      status: 'Active',
      isOnline: true,
      isBusy: false,
      coinsBalance: setupGender === 'Female' ? 200 : 500,
      totalCallsMade: 0,
      totalCallsReceived: 0,
      totalCallDurationMins: 0,
      earnedCoins: 0,
      withdrawnINR: 0,
      audioRatePerMin: 10,
      videoRatePerMin: 20,
      joinedDate: new Date().toLocaleDateString('en-GB'),
      lastActive: 'Just now',
      bio: `Namaskaram! ${setupName.trim()} ready to talk in ${setupLang}!`,
    };
    setUser(newUser);
    try {
      sessionStorage.setItem('matladuko_user_profile', JSON.stringify(newUser));
      localStorage.setItem('matladuko_user_profile', JSON.stringify(newUser));
      sessionStorage.setItem('matladuko_user_logged_in', 'true');
    } catch {}
    setIsLoggedIn(true);
    showToast(
      lang === 'te'
        ? `రిజిస్ట్రేషన్ పూర్తయింది! స్వాగతం ${newUser.displayName}.`
        : `Registration complete! Welcome ${newUser.displayName}.`
    );
    setCurrentScreen('online_users');
    if (onRefreshData) onRefreshData();
  };

  const handleToggleFavorite = async (targetId: string) => {
    try {
      const res = await apiFetch('/api/v1/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineList((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, isFavorite: data.isFavorite } : u))
        );
        if (selectedUserDetail && selectedUserDetail.id === targetId) {
          setSelectedUserDetail((prev) => (prev ? { ...prev, isFavorite: data.isFavorite } : null));
        }
        showToast(data.isFavorite ? 'Added to favorites!' : 'Removed from favorites');
      }
    } catch (e) {
      setOnlineList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, isFavorite: !u.isFavorite } : u))
      );
    }
  };

  const handleToggleBlock = async (targetId: string) => {
    try {
      const res = await apiFetch('/api/v1/blocks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isBlocked) {
          setBlockedUsersList((prev) => [...prev, targetId]);
          setOnlineList((prev) => prev.filter((u) => u.id !== targetId));
          setSelectedUserDetail(null);
          showToast('User blocked. You will not see or receive calls from them.');
        } else {
          setBlockedUsersList((prev) => prev.filter((id) => id !== targetId));
          showToast('User unblocked');
        }
      }
    } catch (e) {
      setBlockedUsersList((prev) => [...prev, targetId]);
      setOnlineList((prev) => prev.filter((u) => u.id !== targetId));
      setSelectedUserDetail(null);
      showToast('User blocked.');
    }
  };

  const handleInitiateCall = async (callee: UserProfile, type: 'audio' | 'video') => {
    setSelectedUserDetail(null);
    const requiredRate = type === 'video' ? callee.videoRatePerMin : callee.audioRatePerMin;

    if (user.coinsBalance < requiredRate) {
      showToast(`Need at least ${requiredRate} coins to start ${type} call. Please recharge.`);
      setCurrentScreen('buy_coins');
      return;
    }

    soundEffects.startRingtone();

    // Prepare resilient session immediately so call starts reliably on Android APK
    const fallbackSession: CallSession = {
      id: `CALL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      callerId: user.id,
      callerName: user.displayName,
      callerAvatar: user.avatarUrl,
      calleeId: callee.id,
      calleeName: callee.displayName,
      calleeAvatar: callee.avatarUrl,
      type,
      status: 'ringing',
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      billedCoins: 0,
      audioRate: callee.audioRatePerMin,
      videoRate: callee.videoRatePerMin,
      creatorCoinsEarned: 0,
      platformCoinsEarned: 0,
      coinToInrRate: 0.2,
      createdAt: Date.now(),
    };

    let session: CallSession = fallbackSession;

    try {
      const res = await apiFetch('/api/v1/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ callerId: user.id, calleeId: callee.id, type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          session = data.session;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Could not initiate call');
        soundEffects.stopRingtone();
        return;
      }
    } catch (e) {
      console.warn('Network call initiate offline fallback:', e);
    }

    setActiveCall(session);
    setCallDurationSec(0);
    setCurrentScreen(type === 'video' ? 'video_call' : 'audio_call');

    // Initiate real WebRTC P2P handshake via WebSocket signaling server
    try {
      webrtcManagerRef.current?.startCall(callee.id, type, {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
      });
    } catch (rtcErr) {
      console.warn('WebRTC start error:', rtcErr);
    }

    // Start 45-second timeout if other user does not answer
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = setTimeout(() => {
      soundEffects.stopRingtone();
      soundEffects.playEndChime();
      webrtcManagerRef.current?.endCall('No answer');
      setActiveCall(null);
      setCurrentScreen('online_users');
      showToast(`${callee.displayName} కాల్ లిఫ్ట్ చేయలేదు (User did not answer).`);
    }, 45000);
  };

  const handleRandomCall = async () => {
    // Select suitable random user of opposite gender who is online and not busy
    const available = onlineList.filter(
      (u) => (user.gender === 'Male' ? u.gender === 'Female' : u.gender === 'Male') && u.id !== user.id && !u.isBusy
    );

    if (available.length === 0) {
      showToast(lang === 'te' ? 'ఈ సమయంలో సరిపడే ఆన్‌లైన్ యూజర్లు ఎవరూ లేరు.' : 'No matched users online right now.');
      return;
    }

    setRandomMatchingActive(true);
    soundEffects.startRingtone();

    const randomCallee = available[Math.floor(Math.random() * available.length)];
    setTimeout(() => {
      setRandomMatchingActive(false);
      handleInitiateCall(randomCallee, 'audio');
    }, 1200);
  };

  const handleEndActiveCall = async () => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (!activeCall) return;
    soundEffects.stopRingtone();
    soundEffects.playEndChime();

    // Terminate WebRTC peer connection
    try {
      webrtcManagerRef.current?.endCall();
    } catch (e) {}
    setRemoteStream(null);
    setLocalStream(null);

    const durationSec = callDurationSec || Math.max(1, Math.floor((Date.now() - (activeCall.startTime || Date.now())) / 1000));
    const durationMins = Math.max(1, Math.ceil(durationSec / 60));
    const rate = activeCall.type === 'video' ? activeCall.videoRate : activeCall.audioRate;
    const coinsDeducted = durationMins * rate;
    const newBalance = Math.max(0, user.coinsBalance - coinsDeducted);

    const endedSession: CallSession = {
      ...activeCall,
      status: 'ended',
      endTime: Date.now(),
      durationSeconds: durationSec,
      billedCoins: coinsDeducted,
    };

    try {
      const res = await apiFetch(`/api/v1/calls/${activeCall.id}/end`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastEndedCall(data.session);
        setUser((prev) => ({ ...prev, coinsBalance: data.callerRemainingCoins }));
      } else {
        setLastEndedCall(endedSession);
        setUser((prev) => ({ ...prev, coinsBalance: newBalance }));
      }
    } catch (e) {
      setLastEndedCall(endedSession);
      setUser((prev) => ({ ...prev, coinsBalance: newBalance }));
    }

    setActiveCall(null);
    setCurrentScreen('call_ended');
    fetchHistory();
    fetchWallet();
    if (onRefreshData) onRefreshData();
  };

  const handleBuyCoins = async () => {
    if (!selectedPackage) return;
    try {
      const res = await apiFetch('/api/v1/wallet/buy-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({ ...prev, coinsBalance: data.newBalance }));
        setPaymentSuccessPopup(true);
        fetchWallet();
        if (onRefreshData) onRefreshData();
        return;
      }
    } catch (e) {
      console.warn('Buy coins API offline fallback');
    }
    // Offline fallback for buy coins
    setUser((prev) => ({ ...prev, coinsBalance: prev.coinsBalance + selectedPackage.coins }));
    setPaymentSuccessPopup(true);
  };

  const handleWithdrawRequest = async () => {
    try {
      const res = await apiFetch('/api/v1/creator/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountINR: withdrawAmount,
          payoutMethod: withdrawMethod,
          accountDetails: withdrawMethod === 'UPI' ? 'rahul.telugu@upi' : 'HDFC Bank •••• 5678',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawNotice('Withdrawal request submitted! Sent to Finance Admin for payout approval.');
        setUser((prev) => ({ ...prev, earnedCoins: data.remainingEarnedCoins }));
        setTimeout(() => setWithdrawNotice(''), 4500);
        if (onRefreshData) onRefreshData();
        return;
      } else {
        showToast(data.error || 'Withdrawal failed');
        return;
      }
    } catch (e) {
      console.warn('Withdraw API fallback');
    }
    setWithdrawNotice('Withdrawal request submitted! Sent to Finance Admin for payout approval.');
    setUser((prev) => ({ ...prev, earnedCoins: Math.max(0, prev.earnedCoins - (Number(withdrawAmount) * 5)) }));
    setTimeout(() => setWithdrawNotice(''), 4500);
  };

  const handleIncomingDemoCall = () => {
    const caller = onlineList.find((u) => u.gender === 'Female') || onlineList[0];
    if (!caller) return;
    soundEffects.startRingtone();
    setIncomingCallData({
      caller,
      type: 'video',
      sessionId: 'INCOMING_' + Date.now(),
    });
    setCurrentScreen('incoming_call');
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCallData) return;
    soundEffects.stopRingtone();
    soundEffects.playConnectChime();

    // Accept WebRTC call over peer connection
    webrtcManagerRef.current?.acceptIncomingCall(
      incomingCallData.sessionId,
      incomingCallData.caller.id,
      incomingCallData.type
    );

    const session: CallSession = {
      id: incomingCallData.sessionId,
      callerId: incomingCallData.caller.id,
      callerName: incomingCallData.caller.displayName,
      callerAvatar: incomingCallData.caller.avatarUrl,
      calleeId: user.id,
      calleeName: user.displayName,
      calleeAvatar: user.avatarUrl,
      type: incomingCallData.type,
      status: 'connected',
      startTime: Date.now(),
      endTime: null,
      durationSeconds: 0,
      billedCoins: 0,
      audioRate: 10,
      videoRate: 20,
      creatorCoinsEarned: 0,
      platformCoinsEarned: 0,
      coinToInrRate: 0.5,
      createdAt: Date.now(),
    };

    setActiveCall(session);
    setIncomingCallData(null);
    setCallDurationSec(0);
    setCurrentScreen(session.type === 'video' ? 'video_call' : 'audio_call');
  };

  const handleDeclineIncomingCall = () => {
    soundEffects.stopRingtone();
    soundEffects.playEndChime();

    if (incomingCallData) {
      webrtcManagerRef.current?.rejectIncomingCall(
        incomingCallData.sessionId,
        incomingCallData.caller.id
      );
    }

    setIncomingCallData(null);
    setCurrentScreen('online_users');
    showToast('Call declined.');
  };

  // Filtered users: Strictly Opposite Gender and Strictly Online Only
  const displayedUsers = onlineList.filter((u) => {
    if (u.id === user.id) return false;
    if (!u.isOnline) return false;

    // Strict Opposite Gender Rule
    if (user.gender === 'Male' && u.gender !== 'Female') return false;
    if (user.gender === 'Female' && u.gender !== 'Male') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchLang =
        u.preferredLanguage.toLowerCase().includes(q) ||
        u.secondaryLanguages.some((l) => l.toLowerCase().includes(q));
      if (!matchName && !matchLang) return false;
    }
    return true;
  });

  return (
    <div className="relative w-full max-w-md sm:max-w-sm mx-auto h-screen sm:h-[820px] bg-slate-950 text-slate-100 sm:rounded-[40px] shadow-2xl sm:border-4 border-slate-800/80 overflow-hidden flex flex-col font-sans select-none">
      {/* Dynamic Notch / Phone Speaker Bar */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-transparent z-50 flex items-center justify-between px-6 pt-1">
        <span className="text-[11px] font-semibold text-slate-300">9:41</span>
        <div className="w-20 h-3.5 bg-slate-900 rounded-full flex items-center justify-center space-x-1.5 border border-slate-800">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
          <div className="w-8 h-1 rounded-full bg-slate-800"></div>
        </div>
        <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-300">
          <span>5G</span>
          <div className="w-4 h-2.5 border border-slate-400 rounded-xs p-0.5 flex items-center">
            <div className="h-full w-full bg-emerald-400 rounded-2xs"></div>
          </div>
        </div>
      </div>

      {/* Language Quick Toggle floating button in corner */}
      {onToggleLang && (
        <button
          onClick={onToggleLang}
          id="btn-lang-toggle-mobile"
          title="Toggle Telugu / English"
          className="absolute top-8 right-4 z-40 px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs text-rose-400 rounded-full flex items-center space-x-1 shadow-lg backdrop-blur-xs transition"
        >
          <Globe className="w-3 h-3" />
          <span className="font-bold">{lang === 'te' ? 'EN' : 'తెలుగు'}</span>
        </button>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-9 left-4 right-4 z-50 bg-rose-600/95 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-xl backdrop-blur-xs flex items-center justify-between border border-rose-400/30"
          >
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5 opacity-80" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Screen Content Area */}
      <div className="flex-1 overflow-y-auto pt-7 pb-16 relative">
        {/* =========================================================================
            SCREEN 1: SPLASH SCREEN
        ========================================================================= */}
        {currentScreen === 'splash' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col justify-between items-center text-center px-6 py-8"
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-6 relative">
                <Heart className="w-12 h-12 text-white fill-white animate-pulse" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-slate-950">
                  <Phone className="w-4 h-4 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mb-2">
                {strings.appName}
              </h1>
              <p className="text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {strings.appSubtitle}
              </p>
              <h2 className="text-lg font-bold text-slate-200 mb-1">{strings.tagline}</h2>
              <p className="text-slate-400 text-xs max-w-xs">{strings.subTagline}</p>
            </div>

            <div className="w-full space-y-4">
              <button
                id="btn-splash-get-started"
                onClick={() => setCurrentScreen('login')}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 transition active:scale-98"
              >
                {strings.getStarted}
              </button>
              <p className="text-[11px] text-slate-400 tracking-wide">{strings.safeSecure}</p>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 2: LOGIN SCREEN
        ========================================================================= */}
        {currentScreen === 'login' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-6 py-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentScreen('splash')}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                  Android Client App
                </span>
              </div>

              <div className="text-center my-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-black text-white">
                  {lang === 'te' ? 'మొబైల్ లాగిన్' : strings.welcomeBack}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'te'
                    ? 'OTP ద్వారా లాగిన్ అయి వివరాలు & కాల్స్ చూడండి'
                    : 'Login with mobile OTP to access callers & wallet details'}
                </p>
              </div>

              {/* Security Banner: Details locked until OTP verification */}
              <div className="p-3 mb-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200">
                    {lang === 'te' ? 'సెక్యూరిటీ వెరిఫికేషన్:' : 'Secure Access:'}
                  </span>{' '}
                  <span className="text-slate-400">
                    {lang === 'te'
                      ? 'మీ మొబైల్ నంబర్ OTP వెరిఫై చేసిన తర్వాతే ఆన్‌లైన్ యూజర్లు మరియు ప్రొఫైల్ వివరాలు కనిపిస్తాయి.'
                      : 'Live callers, profile, and wallet details are revealed only after OTP login.'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {lang === 'te' ? 'మీ మొబైల్ నంబర్' : strings.mobileNumber}
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      ⚡ Default OTP: 123456
                    </span>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-900 focus-within:border-rose-500 transition">
                    <span className="px-3.5 py-3 bg-slate-800 text-slate-300 text-xs font-bold flex items-center border-r border-slate-700">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={inputPhone.replace('+91', '')}
                      onChange={(e) => setInputPhone('+91' + e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210"
                      className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white font-mono tracking-wider focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lang === 'te'
                      ? 'మొదటిసారి లాగిన్ అయితే మీ పేరు & జెండర్ నమోదు చేసుకోండి. OTP ఆటో-ఫిల్ అవుతుంది.'
                      : 'First time? Enter phone to register. Default OTP (123456) will be auto-filled.'}
                  </p>
                </div>

                <button
                  id="btn-login-send-otp"
                  disabled={isSendingOtp}
                  onClick={handleSendOtp}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-500/25 transition active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSendingOtp ? (
                    <span>{lang === 'te' ? 'OTP పంపుతోంది...' : 'Sending OTP...'}</span>
                  ) : (
                    <span>{lang === 'te' ? 'OTP పొందండి & లాగిన్ అవ్వండి (Get OTP)' : strings.sendOtp}</span>
                  )}
                </button>

                {/* Dedicated Admin Portal Direct Access */}
                {onOpenAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="w-full mt-4 py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-400 flex items-center justify-center gap-2 text-xs font-semibold transition shadow-sm group"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                    <span>{lang === 'te' ? '🛡️ అడ్మిన్ కంట్రోల్ ప్యానెల్ (Live Calls Monitoring)' : '🛡️ Open Admin Live Calls Portal'}</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 px-4 mt-4">
              {strings.termsNotice}
            </p>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 3: OTP VERIFICATION
        ========================================================================= */}
        {currentScreen === 'otp' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-6 py-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentScreen('login')} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Step 2: Enter OTP
                </span>
              </div>

              <div className="my-5">
                <h2 className="text-xl font-black text-white mb-1">
                  {lang === 'te' ? 'OTP వెరిఫై చేయండి' : strings.verifyOtp}
                </h2>
                <p className="text-xs text-slate-400">
                  {strings.otpSentMessage} <span className="text-rose-400 font-bold font-mono">{inputPhone}</span>
                </p>
              </div>

              {/* Demo Helper Banner */}
              <div className="mb-4 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300 font-medium">
                    {lang === 'te' ? 'డెమో OTP కోడ్:' : 'Demo OTP Code:'}{' '}
                    <strong className="text-emerald-400 font-mono text-sm">123456</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpDigits(['1', '2', '3', '4', '5', '6'])}
                  className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-500/30 transition"
                >
                  {lang === 'te' ? 'ఆటో-ఫిల్' : 'Auto-fill'}
                </button>
              </div>

              {/* 6 OTP boxes */}
              <div className="flex justify-between gap-1.5 my-6">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const copy = [...otpDigits];
                      copy[idx] = val;
                      setOtpDigits(copy);
                    }}
                    className="w-11 h-13 rounded-xl bg-slate-900 border border-slate-700 text-center text-lg font-black text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
                  />
                ))}
              </div>

              <div className="text-center text-xs text-slate-400">
                {strings.resendIn} <span className="text-rose-400 font-bold">00:{otpTimer < 10 ? '0' + otpTimer : otpTimer}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                id="btn-verify-otp"
                disabled={isVerifyingOtp}
                onClick={handleVerifyOtp}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isVerifyingOtp ? (
                  <span>{lang === 'te' ? 'వెరిఫై చేస్తోంది...' : 'Verifying...'}</span>
                ) : (
                  <span>{lang === 'te' ? 'వెరిఫై చేసి వివరాలు చూడండి (Login & Unlock)' : 'Verify & Unlock Details'}</span>
                )}
              </button>
              <button
                onClick={() => {
                  setInputPhone('+919876543210');
                  setOtpDigits(['1', '2', '3', '4', '5', '6']);
                }}
                className="w-full py-2 bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold rounded-xl border border-slate-800"
              >
                {lang === 'te' ? 'రీసెట్ చేయండి' : 'Reset Inputs'}
              </button>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 4: PROFILE SETUP (NO REAL PHOTO / STRICT PRIVACY)
        ========================================================================= */}
        {currentScreen === 'profile_setup' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-6 py-4 flex flex-col h-full justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentScreen('online_users')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white">{strings.completeProfile}</h2>
              </div>
              <p className="text-xs text-slate-400">{strings.completeProfileHelp}</p>

              {/* Privacy Badge */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2 text-[11px] text-emerald-300">
                <Shield className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>100% Privacy: Predefined avatars only. Zero camera uploads, zero GPS location, zero address tracking.</span>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Rahul, Sneha, Karthik"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Gender selector cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{strings.gender}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSetupGender(g)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center space-y-1 ${
                        setupGender === g
                          ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>{g === 'Male' ? strings.male : g === 'Female' ? strings.female : strings.other}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{strings.dob}</label>
                <input
                  type="date"
                  value={setupDob}
                  onChange={(e) => setSetupDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{strings.preferredLanguage}</label>
                <select
                  value={setupLang}
                  onChange={(e) => setSetupLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="Telugu">తెలుగు (Telugu) - Default</option>
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                </select>
              </div>

              {/* Predefined Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{strings.chooseAvatar}</label>
                <div className="grid grid-cols-5 gap-2">
                  {PREDEFINED_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSetupAvatarId(av.id)}
                      className={`relative p-1 rounded-xl border transition ${
                        setupAvatarId === av.id
                          ? 'border-rose-500 bg-rose-500/20 scale-105'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <img src={av.svgUrl} alt={av.name} className="w-10 h-10 rounded-full mx-auto" />
                      {setupAvatarId === av.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-900">
              <button
                id="btn-complete-profile"
                onClick={handleSaveProfile}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-98"
              >
                {strings.continueBtn}
              </button>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 5: ONLINE USERS TAB (PRIMARY DISCOVERY)
        ========================================================================= */}
        {currentScreen === 'online_users' && (
          <div className="px-4 py-2 flex flex-col h-full">
            {/* Header with Search & Tab switch */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-black text-white flex items-center space-x-1.5">
                  <span>{strings.appName}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  {user.gender === 'Male' ? '👩 ఆన్‌లైన్ స్త్రీ యూజర్లు' : '👨 ఆన్‌లైన్ పురుష కాలర్లు'} ({displayedUsers.length})
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{user.coinsBalance}</span>
                </div>
                <button
                  onClick={fetchUsers}
                  title="రీఫ్రెష్ చేయండి"
                  className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async () => {
                    const currentId = user.id;
                    try {
                      if (currentId) {
                        apiFetch('/api/v1/auth/logout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-user-id': currentId },
                          body: JSON.stringify({ userId: currentId }),
                        }).catch(() => {});
                      }
                      localStorage.removeItem('matladuko_user_logged_in');
                      localStorage.removeItem('matladuko_user_profile');
                      sessionStorage.removeItem('matladuko_user_logged_in');
                      sessionStorage.removeItem('matladuko_user_profile');
                      webrtcManagerRef.current?.cleanup();
                    } catch {}
                    setIsLoggedIn(false);
                    setUser(getStoredUser());
                    setInputPhone('+91');
                    setCurrentScreen('login');
                    showToast(lang === 'te' ? 'లాగౌట్ అయ్యారు.' : 'Logged out.');
                  }}
                  title="లాగౌట్ (Log Out)"
                  className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center space-x-1 transition active:scale-95"
                >
                  <LogOut className="w-3 h-3 text-rose-400" />
                  <span>{lang === 'te' ? 'లాగౌట్' : 'Logout'}</span>
                </button>
              </div>
            </div>

            {/* Strict Gender Notice Banner */}
            {user.gender === 'Male' ? (
              <div className="p-2.5 mb-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[10px]">
                    👩 స్త్రీ యూజర్లు మాత్రమే
                  </span>
                  <span className="text-slate-300">ఆన్‌లైన్ ఉన్న మహిళలకు మాత్రమే కాల్ చేయవచ్చు</span>
                </div>
              </div>
            ) : (
              <div className="p-3 mb-2.5 rounded-xl bg-gradient-to-r from-rose-950/70 to-indigo-950/70 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-bold text-white">మీరు ఆన్‌లైన్‌లో ఉన్నారు (Online)</span>
                  </div>
                  <p className="text-[10px] text-rose-300 mt-0.5">
                    పురుష కాలర్లు మీకు కాల్ చేసినప్పుడు కాల్ లిఫ్ట్ చేసి మాట్లాడండి.
                  </p>
                </div>
                <button
                  onClick={handleIncomingDemoCall}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center space-x-1 shadow-md"
                >
                  <Phone className="w-3 h-3" />
                  <span>కాల్ లిఫ్ట్ టెస్ట్</span>
                </button>
              </div>
            )}

            {/* Top Pills: Online Users vs Favorites */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-2.5">
              <button
                onClick={() => setCurrentScreen('online_users')}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs"
              >
                {user.gender === 'Male' ? 'ఆన్‌లైన్ స్త్రీలు (Female Users)' : 'కాలర్స్ లిస్ట్ (Callers)'}
              </button>
              <button
                onClick={() => setCurrentScreen('favorites')}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white"
              >
                {strings.favorites}
              </button>
            </div>

            {/* Language filter chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none mb-2">
              {['All', 'Telugu', 'English', 'Hindi'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguageFilter(l)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
                    languageFilter === l
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {l === 'Telugu' ? 'తెలుగు (Telugu)' : l}
                </button>
              ))}
            </div>

            {/* User cards list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {displayedUsers.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-3xl">
                    {user.gender === 'Male' ? '👩' : '👨'}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {user.gender === 'Male'
                      ? 'ఈ సమయంలో ఆన్‌లైన్ స్త్రీ యూజర్లు ఎవరూ లేరు'
                      : 'మీరు ఆన్‌లైన్‌లో ఉన్నారు. కాల్స్ కోసం వేచి చూస్తున్నారు'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {user.gender === 'Male'
                      ? 'మరో డివైస్ లేదా బ్రౌజర్ ట్యాబ్‌లో స్త్రీగా రిజిస్టర్ అవ్వండి లేదా రీఫ్రెష్ చేయండి.'
                      : 'పురుష యూజర్లు కాల్ చేయగానే మీ స్క్రీన్ రింగ్ అవుతుంది మరియు లిఫ్ట్ చేయవచ్చు.'}
                  </p>
                  <button
                    onClick={fetchUsers}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    రీఫ్రెష్ చేయండి (Refresh)
                  </button>
                </div>
              ) : (
                displayedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 flex items-center justify-between transition group"
                  >
                    <div
                      onClick={() => setSelectedUserDetail(u)}
                      className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-12 h-12 rounded-full bg-slate-800 p-0.5 border border-slate-700 object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            u.isBusy ? 'bg-amber-400' : u.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                          }`}
                        ></span>
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-bold text-white truncate">{u.displayName}, {u.age}</span>
                          {u.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {u.preferredLanguage} {u.secondaryLanguages.length > 0 && `• ${u.secondaryLanguages.join(', ')}`}
                        </p>
                        <span className={`text-[10px] font-medium ${u.isBusy ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {u.isBusy ? `• ${strings.busyBadge}` : `• ${strings.onlineBadge}`}
                        </span>
                      </div>
                    </div>

                    {/* Audio and Video Call triggers */}
                    <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                      <button
                        id={`btn-audio-call-${u.id}`}
                        disabled={u.isBusy || !u.isOnline}
                        onClick={() => handleInitiateCall(u, 'audio')}
                        title={`Audio Call (${u.audioRatePerMin} coins/min)`}
                        className={`p-2.5 rounded-full transition ${
                          u.isBusy || !u.isOnline
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white active:scale-95'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-video-call-${u.id}`}
                        disabled={u.isBusy || !u.isOnline}
                        onClick={() => handleInitiateCall(u, 'video')}
                        title={`Video Call (${u.videoRatePerMin} coins/min)`}
                        className={`p-2.5 rounded-full transition ${
                          u.isBusy || !u.isOnline
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-indigo-600/25 text-indigo-400 hover:bg-indigo-600 hover:text-white active:scale-95'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Floating Random Call Button */}
            <div className="pt-2">
              <button
                id="btn-random-call"
                onClick={handleRandomCall}
                disabled={randomMatchingActive}
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-rose-500/20 active:scale-98 transition"
              >
                <Shuffle className={`w-4 h-4 ${randomMatchingActive ? 'animate-spin' : ''}`} />
                <span>{randomMatchingActive ? 'Finding Telugu stranger...' : strings.randomCall}</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 6: FAVORITES TAB
        ========================================================================= */}
        {currentScreen === 'favorites' && (
          <div className="px-4 py-2 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-black text-white">{strings.favorites}</h1>
                <p className="text-[11px] text-slate-400">People you have saved</p>
              </div>
            </div>

            {/* Top Pills */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-3">
              <button
                onClick={() => setCurrentScreen('online_users')}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white"
              >
                {strings.onlineUsers}
              </button>
              <button
                onClick={() => setCurrentScreen('favorites')}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs"
              >
                {strings.favorites}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {displayedUsers.filter((u) => u.isFavorite).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <Star className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                  <p>No favorites added yet.</p>
                  <p className="text-[10px] mt-1">Tap the star on any user card to keep in touch.</p>
                </div>
              ) : (
                displayedUsers
                  .filter((u) => u.isFavorite)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between"
                    >
                      <div
                        onClick={() => setSelectedUserDetail(u)}
                        className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={u.avatarUrl}
                            alt={u.displayName}
                            className="w-12 h-12 rounded-full bg-slate-800 p-0.5 border border-slate-700 object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                              u.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          ></span>
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-bold text-white truncate">{u.displayName}, {u.age}</span>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{u.preferredLanguage}</p>
                          <span className={`text-[10px] font-medium ${u.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {u.isOnline ? `• ${strings.onlineBadge}` : '• Offline'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleInitiateCall(u, 'audio')}
                          disabled={!u.isOnline || u.isBusy}
                          className="p-2.5 rounded-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition disabled:opacity-40"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInitiateCall(u, 'video')}
                          disabled={!u.isOnline || u.isBusy}
                          className="p-2.5 rounded-full bg-indigo-600/25 text-indigo-400 hover:bg-indigo-600 hover:text-white transition disabled:opacity-40"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 7: INCOMING CALL SCREEN
        ========================================================================= */}
        {currentScreen === 'incoming_call' && incomingCallData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col justify-between items-center px-6 py-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-center"
          >
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">
                Incoming {incomingCallData.type === 'video' ? 'Video' : 'Audio'} Call
              </p>
              <h2 className="text-xl font-bold text-white">
                {incomingCallData.caller.displayName} is calling you...
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Language: {incomingCallData.caller.preferredLanguage} • 0 Coins (Free for Callee)
              </p>
            </div>

            {/* Glowing avatar radar */}
            <div className="relative my-8">
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
              <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 p-1 shadow-2xl relative z-10 flex items-center justify-center">
                <img
                  src={incomingCallData.caller.avatarUrl}
                  alt={incomingCallData.caller.displayName}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>
            </div>

            {/* Decline & Accept controls */}
            <div className="w-full flex items-center justify-around px-4">
              <div className="flex flex-col items-center space-y-1.5">
                <button
                  id="btn-incoming-decline"
                  onClick={handleDeclineIncomingCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition active:scale-95"
                  title="కాల్ కట్ చేయండి"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-xs text-rose-400 font-bold">
                  {lang === 'te' ? '❌ కట్ చేయండి' : strings.decline}
                </span>
              </div>

              <div className="flex flex-col items-center space-y-1.5">
                <button
                  id="btn-incoming-accept"
                  onClick={handleAcceptIncomingCall}
                  className="w-18 h-18 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 animate-bounce active:scale-95 border-2 border-emerald-300"
                  title="కాల్ లిఫ్ట్ చేయండి"
                >
                  <Phone className="w-8 h-8" />
                </button>
                <span className="text-sm text-emerald-400 font-black">
                  {lang === 'te' ? '📞 కాల్ లిఫ్ట్ చేయండి (Lift Call)' : '📞 Lift Call'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 8: ACTIVE VIDEO CALL SCREEN
        ========================================================================= */}
        {currentScreen === 'video_call' && activeCall && (
          <div className="h-full flex flex-col justify-between p-4 bg-slate-950 relative overflow-hidden">
            {/* Dynamic Environmental Noise Screen Dimming & Vignette (> 75 dB) */}
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={false}
              animate={{
                opacity:
                  !isMuted && ambientNoiseDb > 75
                    ? Math.min(0.92, 0.45 + ((Math.min(ambientNoiseDb, 95) - 75) / 20) * 0.45)
                    : 0,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.55) 0%, rgba(2, 6, 23, 0.92) 65%, rgba(69, 10, 10, 0.45) 100%)',
                backdropFilter: ambientNoiseDb > 75 ? 'brightness(0.72) contrast(1.08)' : 'none',
              }}
            />

            {/* Top overlay bar */}
            <div className="flex items-center justify-between z-20 bg-slate-950/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800">
              <button onClick={handleEndActiveCall} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-xs font-black text-white">{formatTimer(callDurationSec)}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  20 Coins/min • {user.coinsBalance} Coins left
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <CallAudioStatusPill
                  isHighNoise={isHighNoise}
                  noiseDb={ambientNoiseDb}
                  isHeadphonesOn={isHeadphonesOn}
                  isMuted={isMuted}
                  strings={strings}
                  onClick={() => setIsAudioSettingsOpen(true)}
                />
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Ambient Noise / Echo Warning Banner */}
            <CallNoiseBanner
              isHighNoise={isHighNoise}
              noiseDb={ambientNoiseDb}
              micSensitivity={micSensitivity}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              isHeadphonesOn={isHeadphonesOn}
              isDismissed={isNoiseWarningDismissed}
              strings={strings}
              lang={lang}
              onWearHeadphones={handleWearHeadphones}
              onToggleMute={() => setIsMuted(!isMuted)}
              onDismiss={() => setIsNoiseWarningDismissed(true)}
              onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            />

            {/* Remote Peer Video / Stream */}
            <div className="relative flex-1 my-3 rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
              {remoteStream ? (
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStream && el.srcObject !== remoteStream) {
                      el.srcObject = remoteStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={activeCall.callerId === user.id ? activeCall.calleeAvatar : activeCall.callerAvatar}
                    alt={activeCall.callerId === user.id ? activeCall.calleeName : activeCall.callerName}
                    className="w-28 h-28 rounded-full border-4 border-rose-500/40 shadow-2xl animate-pulse"
                  />
                  <h3 className="text-base font-bold text-white mt-3">
                    {activeCall.callerId === user.id ? activeCall.calleeName : activeCall.callerName}
                  </h3>
                  <p className="text-xs text-rose-400 font-medium">
                    {activeCall.status === 'ringing' ? 'కాల్ రింగ్ అవుతోంది... (Ringing)' : 'Live WebRTC Video Connected'}
                  </p>
                </div>
              )}

              {/* WebRTC Live Status Pill */}
              <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 z-10 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>WebRTC P2P • SRTP Live</span>
              </div>

              {/* Floating PiP Caller Video */}
              <div className="absolute top-3 right-3 w-20 h-28 rounded-xl bg-slate-900 border-2 border-indigo-500 shadow-xl overflow-hidden flex flex-col items-center justify-center z-10">
                {isCameraOff ? (
                  <CameraOff className="w-6 h-6 text-slate-600" />
                ) : localStream ? (
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && localStream && el.srcObject !== localStream) {
                        el.srcObject = localStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-12 h-12 rounded-full" />
                )}
                <span className="absolute bottom-1 bg-black/70 px-1.5 rounded text-[8px] text-slate-300 font-bold">You</span>
              </div>
            </div>

            {/* Bottom Call Controls */}
            <div className="flex items-center justify-around bg-slate-900/90 backdrop-blur-md py-3 px-4 rounded-2xl border border-slate-800 z-20">
              <button
                onClick={() => {
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  webrtcManagerRef.current?.setMute(newMuted);
                }}
                className={`p-3 rounded-full transition ${isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  if (isHeadphonesOn) {
                    setIsHeadphonesOn(false);
                    showToast(lang === 'te' ? 'హెడ్‌ఫోన్స్ తీసివేయబడ్డాయి' : 'Headphones disconnected');
                  } else {
                    handleWearHeadphones();
                  }
                }}
                className={`p-3 rounded-full transition ${
                  isHeadphonesOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                }`}
                title={isHeadphonesOn ? strings.headphonesActive : strings.wearHeadphones}
              >
                <Headphones className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const newCamOff = !isCameraOff;
                  setIsCameraOff(newCamOff);
                  webrtcManagerRef.current?.setCameraOff(newCamOff);
                }}
                className={`p-3 rounded-full transition ${isCameraOff ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'}`}
              >
                {isCameraOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3 rounded-full transition ${!isSpeakerOn ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'}`}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                id="btn-end-video-call"
                onClick={handleEndActiveCall}
                className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 transition"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 9: ACTIVE AUDIO CALL SCREEN
        ========================================================================= */}
        {currentScreen === 'audio_call' && activeCall && (
          <div className="h-full flex flex-col justify-between p-4 bg-slate-950 relative overflow-hidden">
            {/* Dynamic Environmental Noise Screen Dimming & Vignette (> 75 dB) */}
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={false}
              animate={{
                opacity:
                  !isMuted && ambientNoiseDb > 75
                    ? Math.min(0.92, 0.45 + ((Math.min(ambientNoiseDb, 95) - 75) / 20) * 0.45)
                    : 0,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.55) 0%, rgba(2, 6, 23, 0.92) 65%, rgba(69, 10, 10, 0.45) 100%)',
                backdropFilter: ambientNoiseDb > 75 ? 'brightness(0.72) contrast(1.08)' : 'none',
              }}
            />

            {/* Top Bar */}
            <div className="flex items-center justify-between z-20 bg-slate-950/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800">
              <button onClick={handleEndActiveCall} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-xs font-black text-white">{formatTimer(callDurationSec)}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  10 Coins/min • Server Timestamps Active
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <CallAudioStatusPill
                  isHighNoise={isHighNoise}
                  noiseDb={ambientNoiseDb}
                  isHeadphonesOn={isHeadphonesOn}
                  isMuted={isMuted}
                  strings={strings}
                  onClick={() => setIsAudioSettingsOpen(true)}
                />
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Ambient Noise / Echo Warning Banner */}
            <CallNoiseBanner
              isHighNoise={isHighNoise}
              noiseDb={ambientNoiseDb}
              micSensitivity={micSensitivity}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              isHeadphonesOn={isHeadphonesOn}
              isDismissed={isNoiseWarningDismissed}
              strings={strings}
              lang={lang}
              onWearHeadphones={handleWearHeadphones}
              onToggleMute={() => setIsMuted(!isMuted)}
              onDismiss={() => setIsNoiseWarningDismissed(true)}
              onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            />

            {/* Centered Avatar & Audio Waveform visualizer */}
            <div className="flex-1 flex flex-col items-center justify-center my-4 relative z-20">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-rose-500 to-indigo-600 shadow-2xl mb-3 relative">
                {/* Concentric real-time amplitude pulsating glow rings reacting dynamically to ambientNoiseDb */}
                <motion.div
                  className={`absolute -inset-1.5 rounded-full border-2 pointer-events-none transition-colors duration-300 ${
                    ambientNoiseDb >= 70
                      ? 'border-rose-500/70 shadow-lg shadow-rose-500/40'
                      : ambientNoiseDb >= 58
                      ? 'border-amber-400/60 shadow-md shadow-amber-400/30'
                      : 'border-indigo-400/40'
                  }`}
                  animate={{
                    scale: isMuted ? 1 : [1, +(1 + (ambientNoiseDb / 100) * 0.28).toFixed(2), 1],
                    opacity: isMuted ? 0 : [0.3, Math.min(0.95, 0.4 + (ambientNoiseDb / 100) * 0.55), 0.3],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isMuted ? 2.2 : Math.max(0.35, +(1.4 - (ambientNoiseDb / 100) * 1.05).toFixed(2)),
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className={`absolute -inset-3.5 rounded-full border pointer-events-none transition-colors duration-300 ${
                    ambientNoiseDb >= 70
                      ? 'border-rose-400/40'
                      : ambientNoiseDb >= 58
                      ? 'border-amber-300/30'
                      : 'border-indigo-300/20'
                  }`}
                  animate={{
                    scale: isMuted ? 1 : [1, +(1 + (ambientNoiseDb / 100) * 0.42).toFixed(2), 1],
                    opacity: isMuted ? 0 : [0.15, Math.min(0.65, 0.2 + (ambientNoiseDb / 100) * 0.4), 0.15],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isMuted ? 2.6 : Math.max(0.48, +(1.8 - (ambientNoiseDb / 100) * 1.25).toFixed(2)),
                    ease: 'easeInOut',
                    delay: 0.1,
                  }}
                />
                <img
                  src={activeCall.calleeAvatar}
                  alt={activeCall.calleeName}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>
              <h3 className="text-xl font-black text-white mb-0.5">{activeCall.calleeName}</h3>
              <p className="text-xs text-rose-400 font-semibold">
                {activeCall.status === 'connected' ? 'Connected in Telugu' : 'Connecting WebRTC Relay...'}
              </p>

              {/* Real-time amplitude-based waveform visualizer */}
              <RealtimeCallWaveform
                ambientNoiseDb={ambientNoiseDb}
                micSensitivity={micSensitivity}
                isMuted={isMuted}
                isHeadphonesOn={isHeadphonesOn}
                strings={strings}
                lang={lang}
                onAdjustSensitivity={(delta) => {
                  setMicSensitivity((prev) => Math.max(20, Math.min(100, prev + delta)));
                }}
                onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
              />

              {/* Subtle visual notification when ambient noise exceeds 75 dB */}
              <AnimatePresence>
                {!isMuted && ambientNoiseDb > 75 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.94 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 px-3 py-1 rounded-full bg-rose-950/75 border border-rose-500/40 text-rose-300 text-[10px] font-semibold flex items-center space-x-1.5 shadow-lg backdrop-blur-md"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>
                      {lang === 'te'
                        ? `వాతావరణ శబ్దం ఎక్కువ (${ambientNoiseDb} dB) • కాల్ నాణ్యత తగ్గింది`
                        : `Loud background noise (${ambientNoiseDb} dB) • Audio clarity reduced`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-around bg-slate-900/90 backdrop-blur-md py-3 px-5 rounded-2xl border border-slate-800 z-20">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-full transition ${isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  if (isHeadphonesOn) {
                    setIsHeadphonesOn(false);
                    showToast(lang === 'te' ? 'హెడ్‌ఫోన్స్ తీసివేయబడ్డాయి' : 'Headphones disconnected');
                  } else {
                    handleWearHeadphones();
                  }
                }}
                className={`p-3.5 rounded-full transition ${
                  isHeadphonesOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                }`}
                title={isHeadphonesOn ? strings.headphonesActive : strings.wearHeadphones}
              >
                <Headphones className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3.5 rounded-full transition ${!isSpeakerOn ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'}`}
                title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                id="btn-end-audio-call"
                onClick={handleEndActiveCall}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 transition"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 10: CALL ENDED POPUP / SUMMARY
        ========================================================================= */}
        {currentScreen === 'call_ended' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col justify-between p-6 text-center">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-3xl mb-3 shadow-lg">
                🎉
              </div>
              <h2 className="text-xl font-black text-white">{strings.callEnded}</h2>
              <p className="text-xs text-slate-400 mt-1">{strings.callDuration}</p>
              <div className="text-2xl font-black text-indigo-400 my-1">
                {lastEndedCall ? formatTimer(lastEndedCall.durationSeconds) : '05:23'}
              </div>

              {lastEndedCall && (
                <div className="my-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Coins Charged:</span>
                    <span className="font-bold text-rose-400">{lastEndedCall.billedCoins} Coins</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Rate Applied:</span>
                    <span>{lastEndedCall.type === 'video' ? '20' : '10'} Coins/min</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Billing Invariant:</span>
                    <span className="text-emerald-400">Connected time only</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  const target = onlineList.find((u) => u.id === lastEndedCall?.calleeId) || onlineList[0];
                  if (target) handleInitiateCall(target, lastEndedCall?.type || 'audio');
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {strings.callAgain}
              </button>
              {lastEndedCall && (
                <button
                  onClick={() => handleToggleFavorite(lastEndedCall.calleeId)}
                  className="w-full py-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>{strings.addToFavorites}</span>
                </button>
              )}
              <button
                onClick={handleRandomCall}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {strings.randomCall}
              </button>
              <button
                onClick={() => setCurrentScreen('online_users')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                {strings.backToOnline}
              </button>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SCREEN 11: BUY COINS SCREEN
        ========================================================================= */}
        {currentScreen === 'buy_coins' && (
          <div className="px-5 py-4 flex flex-col h-full justify-between overflow-y-auto">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <button onClick={() => setCurrentScreen('online_users')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white">{strings.buyCoins}</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">{strings.coinsSubtitle}</p>

              {/* Package cards */}
              <div className="space-y-2.5 mb-5">
                {coinPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedPackage?.id === pkg.id
                        ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-black text-white">{pkg.coins} Coins</span>
                          {pkg.tag && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {pkg.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">₹{pkg.priceINR}</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPackage?.id === pkg.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                    }`}>
                      {selectedPackage?.id === pkg.id && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Methods */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-2">{strings.payWith}</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'UPI', label: 'UPI (GPay/PhonePe)' },
                    { id: 'Credit/Debit Card', label: 'Cards' },
                    { id: 'Net Banking', label: 'Net Banking' },
                    { id: 'Wallet', label: 'Wallets' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition ${
                        selectedPaymentMethod === m.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="btn-confirm-pay"
                onClick={handleBuyCoins}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-500/25 active:scale-98 transition"
              >
                Pay ₹{selectedPackage?.priceINR || 349}
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 12: WALLET SCREEN
        ========================================================================= */}
        {currentScreen === 'wallet' && (
          <div className="px-5 py-4 flex flex-col h-full justify-between overflow-y-auto">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button onClick={() => setCurrentScreen('online_users')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white">My Wallet</h2>
              </div>

              {/* Balance Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-tr from-indigo-900 via-purple-900 to-rose-900 shadow-xl border border-indigo-500/30 text-white mb-5 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-xs text-indigo-200 font-semibold">{strings.yourCoins}</p>
                  <div className="flex items-baseline space-x-2 my-2">
                    <span className="text-3xl font-black">{user.coinsBalance}</span>
                    <span className="text-xs text-amber-300 font-bold uppercase">Coins</span>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('buy_coins')}
                    className="mt-2 px-4 py-2 bg-white text-indigo-950 text-xs font-extrabold rounded-xl shadow-sm hover:bg-indigo-50 active:scale-95 transition"
                  >
                    + {strings.buyCoins}
                  </button>
                </div>
                <Coins className="absolute -bottom-2 -right-2 w-28 h-28 text-white/10" />
              </div>

              {/* Navigation links */}
              <div className="space-y-2">
                <button
                  onClick={() => setCurrentScreen('call_history')}
                  className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs font-semibold text-slate-300 transition"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Call Billing History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setCurrentScreen('earnings')}
                  className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs font-semibold text-slate-300 transition"
                >
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Creator Earnings & Withdrawal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Ledger Transactions */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Transactions</h3>
                <div className="space-y-2 text-xs">
                  {walletTxList.map((tx) => (
                    <div key={tx.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">{tx.createdAt}</div>
                      </div>
                      <div className={`font-black ${tx.amountCoins > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amountCoins > 0 ? `+${tx.amountCoins}` : tx.amountCoins} Coins
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 13: EARNINGS & WITHDRAWAL SCREEN
        ========================================================================= */}
        {currentScreen === 'earnings' && (
          <div className="px-5 py-4 flex flex-col h-full justify-between overflow-y-auto">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <button onClick={() => setCurrentScreen('wallet')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white">{strings.earningsWithdrawal}</h2>
              </div>

              {/* Total earnings card */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 mb-4">
                <p className="text-xs text-slate-400">{strings.totalEarnings}</p>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-2xl font-black text-white">
                    ₹{Math.floor(user.earnedCoins * 0.5)}
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">{user.earnedCoins} Coins</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Withdrawable</span>
                    <span className="text-emerald-400 font-bold">₹{Math.floor(user.earnedCoins * 0.5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Conversion Rate</span>
                    <span className="text-slate-300 font-semibold">1 Coin = ₹0.50 INR</span>
                  </div>
                </div>
              </div>

              {withdrawNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
                  {withdrawNotice}
                </div>
              )}

              {/* Request Withdrawal Box */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{strings.withdraw}</h3>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Amount (Min ₹500)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Payout Method</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['UPI', 'Bank Transfer'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setWithdrawMethod(m)}
                        className={`p-2 rounded-xl border text-center font-bold transition ${
                          withdrawMethod === m
                            ? 'border-indigo-500 bg-indigo-500/15 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  id="btn-request-withdraw"
                  onClick={handleWithdrawRequest}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Request ₹{withdrawAmount} Payout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 14: PROFILE / MENU SCREEN
        ========================================================================= */}
        {currentScreen === 'profile_menu' && (
          <div className="px-5 py-4 flex flex-col h-full justify-between overflow-y-auto">
            <div>
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 mb-4">
                <img src={user.avatarUrl} alt={user.displayName} className="w-14 h-14 rounded-full border-2 border-indigo-500" />
                <div>
                  <h3 className="text-base font-black text-white">{user.displayName}</h3>
                  <p className="text-xs text-rose-400 font-semibold">{user.phoneNumber}</p>
                  <span className="text-[10px] text-slate-400">{user.preferredLanguage} • ID: {user.id}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-semibold text-slate-300">
                <button
                  onClick={() => setCurrentScreen('wallet')}
                  className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>My Wallet ({user.coinsBalance} Coins)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setCurrentScreen('call_history')}
                  className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Call History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setCurrentScreen('favorites')}
                  className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>Favorites</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setCurrentScreen('blocked_users')}
                  className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Blocked Users</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setCurrentScreen('profile_setup')}
                  className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-purple-400" />
                    <span>Edit Profile & Avatar</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="w-full p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 flex items-center justify-between text-indigo-300 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold">{lang === 'te' ? 'అడ్మిన్ పోర్టల్ (Admin Login)' : 'Admin Control Portal'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-900">
              <button
                onClick={() => {
                  try {
                    sessionStorage.removeItem('matladuko_user_logged_in');
                    sessionStorage.removeItem('matladuko_user_profile');
                    localStorage.removeItem('matladuko_user_profile');
                  } catch (e) {}
                  setIsLoggedIn(false);
                  showToast(lang === 'te' ? 'లాగౌట్ విజయవంతమైంది. యూజర్‌ను మార్చుకోవచ్చు.' : 'Logged out. Ready to switch user.');
                  setCurrentScreen('login');
                }}
                className="w-full py-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center justify-center space-x-2 transition active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>{strings.logout}</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN: CALL HISTORY
        ========================================================================= */}
        {currentScreen === 'call_history' && (
          <div className="px-5 py-4 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => setCurrentScreen('wallet')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-white">Call History</h2>
            </div>
            <div className="space-y-2 text-xs">
              {callHistoryList.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img src={c.calleeAvatar} alt={c.calleeName} className="w-9 h-9 rounded-full bg-slate-800" />
                    <div>
                      <div className="font-bold text-white">{c.calleeName}</div>
                      <div className="text-[10px] text-slate-400">
                        {c.type === 'video' ? '📹 Video' : '📞 Audio'} • {formatTimer(c.durationSeconds)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-400">-{c.billedCoins} Coins</div>
                    <div className="text-[10px] text-emerald-400">Settled</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN: BLOCKED USERS
        ========================================================================= */}
        {currentScreen === 'blocked_users' && (
          <div className="px-5 py-4 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => setCurrentScreen('profile_menu')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-white">Blocked Users</h2>
            </div>
            <div className="space-y-2 text-xs">
              {blockedUsersList.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No blocked users.</p>
              ) : (
                blockedUsersList.map((id) => (
                  <div key={id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-white">User ID: {id}</span>
                    <button
                      onClick={() => handleToggleBlock(id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-[11px] font-semibold"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Details Drawer / Modal */}
      <AnimatePresence>
        {selectedUserDetail && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-3xl border-t border-slate-700 p-5 shadow-2xl flex flex-col max-h-[85%]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400">User Profile</span>
              <button onClick={() => setSelectedUserDetail(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <img
                src={selectedUserDetail.avatarUrl}
                alt={selectedUserDetail.displayName}
                className="w-16 h-16 rounded-full border-2 border-rose-500 shadow-md object-cover"
              />
              <div>
                <h3 className="text-lg font-black text-white">{selectedUserDetail.displayName}, {selectedUserDetail.age}</h3>
                <p className="text-xs text-rose-400 font-semibold">{selectedUserDetail.preferredLanguage}</p>
                <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                  <span className={selectedUserDetail.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                    {selectedUserDetail.isOnline ? '🟢 Available' : '⚪ Offline'}
                  </span>
                  <span>• Total Calls: {selectedUserDetail.totalCallsReceived}</span>
                </div>
              </div>
            </div>

            {selectedUserDetail.bio && (
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 italic">
                "{selectedUserDetail.bio}"
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Audio Rate</span>
                <span className="text-white font-bold">{selectedUserDetail.audioRatePerMin} Coins / min</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Video Rate</span>
                <span className="text-white font-bold">{selectedUserDetail.videoRatePerMin} Coins / min</span>
              </div>
            </div>

            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => handleInitiateCall(selectedUserDetail, 'audio')}
                disabled={!selectedUserDetail.isOnline || selectedUserDetail.isBusy}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                <Phone className="w-4 h-4" />
                <span>Audio Call</span>
              </button>
              <button
                onClick={() => handleInitiateCall(selectedUserDetail, 'video')}
                disabled={!selectedUserDetail.isOnline || selectedUserDetail.isBusy}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </button>
            </div>

            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleToggleFavorite(selectedUserDetail.id)}
                className="flex items-center space-x-1 hover:text-white"
              >
                <Star className={`w-3.5 h-3.5 ${selectedUserDetail.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                <span>{selectedUserDetail.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
              </button>
              <button
                onClick={() => {
                  setReportModalOpen(true);
                }}
                className="flex items-center space-x-1 text-rose-400 hover:underline"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
              <button
                onClick={() => handleToggleBlock(selectedUserDetail.id)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportModalOpen && selectedUserDetail && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs">
              <h3 className="text-sm font-bold text-white mb-2">Report {selectedUserDetail.displayName}</h3>
              <p className="text-slate-400 mb-3">Please specify reason for reporting this user:</p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white mb-2"
              >
                <option value="Harassment">Harassment</option>
                <option value="Inappropriate">Inappropriate</option>
                <option value="Fake Profile">Fake Profile</option>
                <option value="Spam">Spam</option>
                <option value="Abuse">Abuse</option>
              </select>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Additional details (optional)..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white mb-3"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await apiFetch('/api/v1/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          reportedUserId: selectedUserDetail.id,
                          reason: reportReason,
                          notes: reportNotes,
                        }),
                      });
                    } catch (e) {}
                    setReportModalOpen(false);
                    setSelectedUserDetail(null);
                    showToast('Report submitted for Admin review.');
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Success Popup */}
      <AnimatePresence>
        {paymentSuccessPopup && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Payment Successful!</h3>
              <p className="text-xs text-slate-300 mt-1">
                {selectedPackage?.coins} Coins added to your wallet.
              </p>
              <div className="text-xs text-amber-400 font-bold my-3">
                New Balance: {user.coinsBalance} Coins
              </div>
              <button
                onClick={() => {
                  setPaymentSuccessPopup(false);
                  setCurrentScreen('online_users');
                }}
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Start Calling Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Navigation Bar (Screens 5, 6, 11, 12, 14) */}
      {!['splash', 'login', 'otp', 'profile_setup', 'incoming_call', 'video_call', 'audio_call', 'call_ended'].includes(
        currentScreen
      ) && (
        <div className="absolute bottom-0 left-0 right-0 h-15 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-around px-2 z-40">
          <button
            onClick={() => setCurrentScreen('online_users')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'online_users' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Home</span>
          </button>

          <button
            onClick={() => setCurrentScreen('favorites')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'favorites' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{strings.favorites}</span>
          </button>

          <button
            onClick={() => setCurrentScreen('buy_coins')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'buy_coins' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-semibold">Coins</span>
          </button>

          <button
            onClick={() => setCurrentScreen('wallet')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'wallet' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Wallet</span>
          </button>

          <button
            onClick={() => setCurrentScreen('profile_menu')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'profile_menu' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>
      )}

      {/* Audio & Ambient Noise Controls Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        noiseDb={ambientNoiseDb}
        micSensitivity={micSensitivity}
        setMicSensitivity={setMicSensitivity}
        isHeadphonesOn={isHeadphonesOn}
        setIsHeadphonesOn={(val) => {
          setIsHeadphonesOn(val);
          if (val) {
            setAmbientNoiseDb(36);
            setIsNoiseWarningDismissed(true);
            showToast(strings.headphonesActive);
          } else {
            showToast(lang === 'te' ? 'హెడ్‌ఫోన్స్ తీసివేయబడ్డాయి' : 'Headphones disconnected');
          }
        }}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onSimulateNoiseSpike={handleSimulateNoiseSpike}
        strings={strings}
        lang={lang}
      />
    </div>
  );
};
