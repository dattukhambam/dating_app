import React from 'react';
import {
  Headphones,
  AlertTriangle,
  Volume2,
  Mic,
  MicOff,
  X,
  Sliders,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageStrings } from '../../utils/i18n';

export interface CallNoiseWarningProps {
  isHighNoise: boolean;
  noiseDb: number;
  micSensitivity: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isHeadphonesOn: boolean;
  isDismissed: boolean;
  strings: LanguageStrings;
  lang: 'te' | 'en';
  onWearHeadphones: () => void;
  onToggleMute: () => void;
  onDismiss: () => void;
  onOpenAudioSettings: () => void;
}

export const CallNoiseBanner: React.FC<CallNoiseWarningProps> = ({
  isHighNoise,
  noiseDb,
  micSensitivity,
  isMuted,
  isHeadphonesOn,
  isDismissed,
  strings,
  lang,
  onWearHeadphones,
  onToggleMute,
  onDismiss,
  onOpenAudioSettings,
}) => {
  // If muted or headphones already on or dismissed or noise is normal, don't show the warning banner
  if (!isHighNoise || isMuted || isHeadphonesOn || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        id="call-ambient-noise-warning"
        className="w-full mx-auto my-2 rounded-2xl bg-gradient-to-r from-rose-950/90 via-amber-950/90 to-slate-900/90 backdrop-blur-xl border border-amber-500/40 p-3 shadow-2xl shadow-rose-950/50 z-30 relative overflow-hidden text-left"
      >
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2.5">
          {/* Pulsing Alert Icon */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          </div>

          {/* Text Information */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-black text-amber-300 tracking-tight leading-tight">
                {strings.highNoiseWarningTitle}
              </h4>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold border border-rose-500/30 shrink-0">
                {noiseDb} dB • {micSensitivity}% Sens
              </span>
            </div>

            <p className="text-[11px] text-slate-200 mt-1 leading-snug font-medium">
              {strings.highNoiseWarningDesc}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex items-center flex-wrap gap-2 mt-2.5">
              {/* Wear Headphones Action Button */}
              <button
                id="btn-wear-headphones"
                onClick={onWearHeadphones}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>{strings.wearHeadphones}</span>
              </button>

              {/* Quick Mute Action Button */}
              <button
                id="btn-quick-mute"
                onClick={onToggleMute}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center space-x-1.5 border border-slate-700 transition active:scale-95"
              >
                <MicOff className="w-3 h-3 text-rose-400" />
                <span>{lang === 'te' ? 'మైక్ మ్యూట్' : 'Mute Mic'}</span>
              </button>

              {/* Audio Settings Details */}
              <button
                onClick={onOpenAudioSettings}
                className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center space-x-1 transition"
                title="Microphone & Noise Details"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>{lang === 'te' ? 'సర్దుబాటు' : 'Tune'}</span>
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition shrink-0"
            title={strings.dismiss}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact Audio Status Indicator Pill for the top call bar
export const CallAudioStatusPill: React.FC<{
  isHighNoise: boolean;
  noiseDb: number;
  isHeadphonesOn: boolean;
  isMuted: boolean;
  strings: LanguageStrings;
  onClick: () => void;
}> = ({ isHighNoise, noiseDb, isHeadphonesOn, isMuted, strings, onClick }) => {
  if (isHeadphonesOn) {
    return (
      <button
        onClick={onClick}
        id="pill-audio-headphones"
        className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center space-x-1 shadow-sm transition hover:bg-emerald-500/30"
        title="Headphones Active - Echo Cancelled"
      >
        <Headphones className="w-3 h-3 text-emerald-400" />
        <span className="hidden xs:inline">{strings.wearingHeadphones}</span>
        <span className="xs:hidden">🎧</span>
      </button>
    );
  }

  if (isMuted) {
    return (
      <button
        onClick={onClick}
        id="pill-audio-muted"
        className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold flex items-center space-x-1 transition hover:bg-slate-700"
      >
        <MicOff className="w-3 h-3 text-rose-400" />
        <span>Muted</span>
      </button>
    );
  }

  if (isHighNoise) {
    return (
      <button
        onClick={onClick}
        id="pill-audio-warning"
        className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center space-x-1 animate-pulse shadow-sm transition hover:bg-amber-500/30"
        title="High Ambient Noise Detected - Wear Headphones"
      >
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span>{noiseDb} dB</span>
        <span className="hidden xs:inline">• Noise High</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      id="pill-audio-normal"
      className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[10px] font-medium flex items-center space-x-1 transition hover:bg-slate-700"
      title="Tap for Audio Sensitivity Settings"
    >
      <Activity className="w-3 h-3 text-indigo-400" />
      <span>{noiseDb} dB</span>
    </button>
  );
};

// Full Audio Tuning & Noise Simulator Modal / Bottom Sheet
export interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  noiseDb: number;
  micSensitivity: number;
  setMicSensitivity: (val: number) => void;
  isHeadphonesOn: boolean;
  setIsHeadphonesOn: (val: boolean) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  onSimulateNoiseSpike: () => void;
  strings: LanguageStrings;
  lang: 'te' | 'en';
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  noiseDb,
  micSensitivity,
  setMicSensitivity,
  isHeadphonesOn,
  setIsHeadphonesOn,
  isMuted,
  setIsMuted,
  onSimulateNoiseSpike,
  strings,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'te' ? 'కాల్ ఆడియో & శబ్ద సెట్టింగ్స్' : 'Call Audio & Noise Controls'}
              </h3>
              <p className="text-[10px] text-slate-400">
                WebRTC Real-time Acoustic Echo Cancellation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Decibel Noise Gauge */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'te' ? 'ప్రస్తుత శబ్ద స్థాయి (Ambient Noise)' : 'Live Ambient Noise Level'}</span>
            </span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                noiseDb > 70
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : noiseDb > 55
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {noiseDb} dB {noiseDb > 70 ? '• High' : noiseDb > 55 ? '• Moderate' : '• Optimal'}
            </span>
          </div>

          {/* Meter Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                noiseDb > 70
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : noiseDb > 55
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(15, noiseDb))}%` }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>20 dB (Quiet)</span>
            <span>55 dB (Room)</span>
            <span>70 dB (Warning)</span>
            <span>90 dB (Loud)</span>
          </div>
        </div>

        {/* Headphones Toggle */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isHeadphonesOn
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>{strings.wearHeadphones}</span>
                {isHeadphonesOn && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {lang === 'te'
                  ? 'ఎకోను నివారిస్తుంది & అవతలివారి మాట స్పష్టంగా వినిపిస్తుంది'
                  : 'Prevents speaker feedback & eliminates audio echo'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsHeadphonesOn(!isHeadphonesOn)}
            className={`w-12 h-6 rounded-full transition p-0.5 flex items-center ${
              isHeadphonesOn ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Microphone Sensitivity Slider */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>{strings.micSensitivity}</span>
            </span>
            <span className="text-indigo-400 font-mono font-bold">{micSensitivity}%</span>
          </div>

          <input
            type="range"
            min={20}
            max={100}
            value={micSensitivity}
            onChange={(e) => setMicSensitivity(Number(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Low (Reduces background noise)</span>
            <span>High (Picks up distant speech)</span>
          </div>
        </div>

        {/* Interactive Noise Spike Simulation Button (Allows user & reviewer to test on-demand) */}
        <div className="pt-1">
          <button
            id="btn-simulate-noise-spike"
            onClick={onSimulateNoiseSpike}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-2 transition active:scale-98"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>
              {lang === 'te'
                ? 'శబ్ద హెచ్చరికను తనిఖీ చేయండి (Simulate High Noise)'
                : 'Simulate High Ambient Noise Alert'}
            </span>
          </button>
        </div>

        {/* Informative Note */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === 'te'
              ? 'హెడ్‌ఫోన్స్ ధరించడం ద్వారా తెలుగు సంభాషణ అత్యంత సహజంగా మరియు స్పష్టంగా ఉంటుంది.'
              : 'Using wired or Bluetooth earphones ensures optimal Telugu stranger call clarity.'}
          </span>
        </div>
      </div>
    </div>
  );
};
