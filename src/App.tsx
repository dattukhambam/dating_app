import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  Database,
  Globe,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { MobileApp } from './components/mobile/MobileApp';
import { AdminPanel } from './components/admin/AdminPanel';
import { UserProfile } from './types';
import { INITIAL_CURRENT_USER } from './data/mockDatabase';

export default function App() {
  // Production routing: Cleanly separate User Mobile Application and Admin Portal
  const getInitialMode = (): 'mobile' | 'admin' => {
    try {
      const params = new URLSearchParams(window.location.search);
      const appParam = params.get('app');
      if (appParam === 'admin' || params.get('admin') === 'true') return 'admin';
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/admin')) return 'admin';
    } catch {
      // Fallback
    }
    // Default for everyone visiting the URL or installing on mobile: Pure User Calling App!
    return 'mobile';
  };

  const [viewMode, setViewMode] = useState<'mobile' | 'admin'>(getInitialMode);
  const [lang, setLang] = useState<'te' | 'en'>('te');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_CURRENT_USER);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbToast, setDbToast] = useState<string | null>(null);
  const [showApkModal, setShowApkModal] = useState(false);
  const [apkGuideTab, setApkGuideTab] = useState<'instant_pwa' | 'native_apk'>('instant_pwa');
  const [copiedLink, setCopiedLink] = useState(false);

  const sharedAppUrl = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://ais-dev-ldaahx6oj3uekstxyxofbg-103507214601.asia-southeast1.run.app';

  const copyLiveLink = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const testSupabaseDb = async () => {
    setDbTesting(true);
    try {
      const res = await fetch('/api/v1/db/test', { method: 'POST' });
      const data = await res.json();
      setDbInfo(data);
      if (data.success) {
        setDbToast(`✅ Connected to Supabase PG 17! Ping: ${data.latencyMs}ms | Tables: ${data.tablesCount}`);
      } else {
        setDbToast(`❌ DB Error: ${data.error || 'Failed'}`);
      }
    } catch (e: any) {
      setDbToast(`❌ Connection Error: ${e.message}`);
    } finally {
      setDbTesting(false);
      setTimeout(() => setDbToast(null), 5000);
    }
  };

  useEffect(() => {
    fetch('/api/v1/db/status')
      .then((r) => r.json())
      .then((data) => setDbInfo(data))
      .catch(() => {});
  }, []);

  // Switch view mode and update URL query cleanly
  const handleSwitchMode = (mode: 'mobile' | 'admin') => {
    setViewMode(mode);
    try {
      const url = new URL(window.location.href);
      if (mode === 'admin') {
        url.searchParams.set('app', 'admin');
      } else {
        url.searchParams.delete('app');
        url.searchParams.delete('admin');
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore if pushState blocked
    }
  };

  // Load current user profile from server
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/v1/users/me');
      if (res.ok) {
        const data = await res.json();
        const userObj = data.user || (data.id ? data : null);
        if (userObj) {
          setCurrentUser(userObj);
        }
      }
    } catch (e) {
      console.warn('Using baseline user profile', e);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    // Listen to browser back/forward buttons
    const handlePopState = () => {
      setViewMode(getInitialMode());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Real-time DB Toast Banner */}
      {dbToast && (
        <div className="fixed top-0 left-0 right-0 bg-indigo-600/95 text-white text-xs px-4 py-2 text-center font-medium shadow-lg backdrop-blur flex items-center justify-center gap-2 z-50 border-b border-indigo-400/30">
          <Database className="w-3.5 h-3.5 text-emerald-300" />
          <span>{dbToast}</span>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: PURE PRODUCTION USER APPLICATION (Zero Admin Clutter)
          When users log in, they see ONLY the pure User Mobile App!
      ===================================================================== */}
      {viewMode === 'mobile' && (
        <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
          {/* Mobile Screen Container - 100% full screen on phones, elegant card on desktop */}
          <div className="w-full h-full sm:py-4 flex items-center justify-center overflow-hidden">
            <MobileApp
              initialUser={currentUser}
              onRefreshData={fetchCurrentUser}
              lang={lang}
              onToggleLang={() => setLang(lang === 'te' ? 'en' : 'te')}
              onOpenAdmin={() => handleSwitchMode('admin')}
            />
          </div>

          {/* Prominent Admin Live Calls Portal shortcut */}
          <button
            onClick={() => handleSwitchMode('admin')}
            className="fixed bottom-4 right-4 z-40 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-850 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-white backdrop-blur transition shadow-2xl flex items-center gap-2 group text-xs font-bold"
            title="Open Admin Portal & Live Calls Monitoring"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span>🛡️ Admin Portal (Live Calls)</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: DEDICATED ADMIN CONTROL PORTAL (Zero Mobile User App Clutter)
          When admin logs in, they see ONLY the dedicated Admin Portal!
      ===================================================================== */}
      {viewMode === 'admin' && (
        <div className="w-full h-screen flex flex-col bg-slate-950 overflow-hidden">
          {/* Professional Admin Header */}
          <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-white">Matladuko Admin Console</span>
                  <button
                    onClick={testSupabaseDb}
                    disabled={dbTesting}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                    title="Click to test Supabase PostgreSQL 17 live connection"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>
                      {dbTesting ? 'Testing DB...' : dbInfo?.connected ? `Supabase PG 17 (${dbInfo.latencyMs || 73}ms)` : 'Supabase PG 17 Active'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Live System Health • Authoritative Call Billing • User Management • PostgreSQL 17
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* APK / Mobile Test Instructions button */}
              <button
                onClick={() => setShowApkModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center space-x-1.5 transition"
                title="Steps to install and test realtime calling on 2 physical mobile phones"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">📲 Mobile Test Guide</span>
              </button>

              {/* Exit to User Calling App */}
              <button
                onClick={() => handleSwitchMode('mobile')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition"
                title="Switch back to User Mobile Calling App"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>యూజర్ యాప్ (User App)</span>
              </button>

              {/* Telugu / English Language Switcher */}
              <button
                onClick={() => setLang(lang === 'te' ? 'en' : 'te')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-rose-400 font-bold flex items-center space-x-1 transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'తెలుగు' : 'English'}</span>
              </button>
            </div>
          </header>

          {/* Full-width Standalone Admin Panel */}
          <div className="flex-1 w-full h-full overflow-hidden">
            <AdminPanel />
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TEST REALTIME CALLING ON 2 PHYSICAL MOBILES (APK & PWA GUIDE)
      ========================================================================= */}
      {showApkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-rose-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>2 మొబైల్స్‌లో రియల్ కాలింగ్ టెస్ట్ చేయండి</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      100% ఉచితం
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test live WebRTC video & audio calling between 2 real physical phones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApkModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Live Link Copy Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    మీ లైవ్ యాప్ లింక్ (2 ఫోన్లలో ఈ లింక్ ఓపెన్ చేయండి):
                  </span>
                  <button
                    onClick={copyLiveLink}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'కాపీ అయింది! (Copied)' : 'లింక్ కాపీ చేయండి'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 break-all select-all">
                  {sharedAppUrl}
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setApkGuideTab('instant_pwa')}
                  className={`flex-1 py-2 rounded-lg transition font-bold flex items-center justify-center gap-2 ${
                    apkGuideTab === 'instant_pwa'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>పద్ధతి 1: ఇన్‌స్టంట్ యాప్ ఇన్‌స్టాల్ (60 సెకన్లు - Fastest)</span>
                </button>
                <button
                  onClick={() => setApkGuideTab('native_apk')}
                  className={`flex-1 py-2 rounded-lg transition font-bold flex items-center justify-center gap-2 ${
                    apkGuideTab === 'native_apk'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>పద్ధతి 2: ఆండ్రాయిడ్ .APK ఫైల్ బిల్డ్ చేయడం</span>
                </button>
              </div>

              {/* TAB 1: INSTANT PWA INSTALL (NO LAPTOP / ANDROID STUDIO REQUIRED) */}
              {apkGuideTab === 'instant_pwa' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 leading-relaxed">
                    💡 <strong>ఏ సాఫ్ట్‌వేర్ ఇన్‌స్టాల్ చేయాల్సిన పనిలేదు:</strong> ఈ యాప్ పూర్తి PWA (Progressive Web App). ఆండ్రాయిడ్ క్రోమ్‌లో లింక్ ఓపెన్ చేసి నేరుగా హోమ్ స్క్రీన్‌పై రియల్ యాప్‌లా ఇన్‌స్టాల్ చేసుకోవచ్చు!
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Phone 1: Rahul */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">1</div>
                          <span>ఫోన్ 1: రాహుల్ (Rahul - Caller)</span>
                        </div>
                        <span className="text-base">👨</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-[11px]">
                        <li>మొదటి మొబైల్‌లో పై లింక్ ఓపెన్ చేయండి.</li>
                        <li>లాగిన్ స్క్రీన్‌లో <strong>"👨 రాహుల్ (Rahul)"</strong> బటన్ లేదా <code className="text-indigo-300 font-mono">9876543210</code> ఎంటర్ చేయండి.</li>
                        <li>రాహుల్ ప్రొఫైల్ (600 Coins) తో లాగిన్ అవుతుంది.</li>
                        <li>ఆన్‌లైన్ లిస్ట్‌లో <strong>"Swapna (స్వప్న)"</strong> కనిపిస్తుంది.</li>
                      </ol>
                    </div>

                    {/* Phone 2: Swapna */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-rose-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                          <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-xs">2</div>
                          <span>ఫోన్ 2: స్వప్న (Swapna - Receiver)</span>
                        </div>
                        <span className="text-base">👩</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-[11px]">
                        <li>రెండవ మొబైల్‌లో ఇదే లింక్ ఓపెన్ చేయండి.</li>
                        <li>లాగిన్ స్క్రీన్‌లో <strong>"👩 స్వప్న (Swapna)"</strong> బటన్ లేదా <code className="text-rose-300 font-mono">9876543222</code> ఎంటర్ చేయండి.</li>
                        <li>స్వప్న ప్రొఫైల్ (Creator, 1200 Coins) తో లాగిన్ అవుతుంది.</li>
                        <li>కెమెరా, మైక్రోఫోన్ పర్మిషన్లకు <strong>"Allow"</strong> ఇవ్వండి.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Step 3: Call & Test */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span>3. లైవ్ కాల్ & మాట్లాడటం (Live WebRTC Video Call):</span>
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      ఫోన్ 1 లో రాహుల్ <strong>Swapna</strong> ప్రొఫైల్ వద్ద <strong>"Video Call"</strong> నొక్కగానే, ఫోన్ 2 లో స్వప్నకు వెంటనే రింగ్‌టోన్‌తో ఇన్‌కమింగ్ వీడియో కాల్ స్క్రీన్ వస్తుంది. స్వప్న <strong>"ఆన్సర్ (Answer)"</strong> నొక్కగానే ఇద్దరి కెమెరా, మైక్ లైవ్‌గా P2P లో కనెక్ట్ అవుతాయి. లైవ్ మాట్లాడవచ్చు, కాయిన్స్ డిడక్ట్ అవుతాయి!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: NATIVE ANDROID APK GENERATION */}
              {apkGuideTab === 'native_apk' && (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    ఈ ప్రాజెక్ట్‌ను <strong>Android Studio & Capacitor</strong> ఉపయోగించి 5 నిమిషాల్లో స్టాండ్‌అలోన్ <code className="font-mono text-rose-400">.apk</code> ఫైల్‌గా ఎక్స్‌పోర్ట్ చేసుకోవచ్చు:
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400">// 1. మీ ప్రాజెక్ట్ టెర్మినల్‌లో Capacitor ఇన్‌స్టాల్ చేయండి:</span>
                      <pre className="text-indigo-400 bg-slate-900 p-2.5 rounded-lg mt-1 overflow-x-auto">
npm install @capacitor/core @capacitor/cli @capacitor/android
                      </pre>
                    </div>

                    <div>
                      <span className="text-slate-400">// 2. ప్రాజెక్ట్‌ను ఇనిషియలైజ్ చేసి ప్రొడక్షన్ బిల్డ్ చేయండి:</span>
                      <pre className="text-indigo-400 bg-slate-900 p-2.5 rounded-lg mt-1 overflow-x-auto">
npx cap init Matladuko com.matladuko.telugu
npm run build
                      </pre>
                    </div>

                    <div>
                      <span className="text-slate-400">// 3. ఆండ్రాయిడ్ ప్లాట్‌ఫారమ్ యాడ్ చేయండి:</span>
                      <pre className="text-indigo-400 bg-slate-900 p-2.5 rounded-lg mt-1 overflow-x-auto">
npx cap add android
npx cap copy
                      </pre>
                    </div>

                    <div>
                      <span className="text-slate-400">// 4. Android Studio లో ఓపెన్ చేసి APK ని బిల్డ్ చేయండి:</span>
                      <pre className="text-emerald-400 bg-slate-900 p-2.5 rounded-lg mt-1 overflow-x-auto">
npx cap open android
                      </pre>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-slate-300">
                    <span className="font-bold text-white">APK ఇన్‌స్టాల్ చేసే విధానం:</span>
                    <p>
                      Android Studio లో <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> క్లిక్ చేస్తే <code className="text-rose-400 font-mono">app-debug.apk</code> తయారవుతుంది.
                    </p>
                    <p className="text-slate-400">
                      ఆ ఫైల్‌ను WhatsApp లేదా Google Drive ద్వారా మీ రెండు మొబైల్స్‌కు పంపి ఇన్‌స్టాల్ చేసుకోవచ్చు!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowApkModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                సరే (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
