import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  PhoneOff,
  Video,
  Mic,
  ShieldAlert,
  Radio,
  Sliders,
  X,
  Maximize2,
  Camera,
  AlertTriangle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { CallSession } from '../../types';
import { apiFetch } from '../../utils/apiConfig';

interface AudioMonitorModalProps {
  call: CallSession;
  onClose: () => void;
  onTerminate: (callId: string) => void;
  showToast: (msg: string) => void;
}

export const AudioMonitorModal: React.FC<AudioMonitorModalProps> = ({
  call,
  onClose,
  onTerminate,
  showToast,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [monitorVolume, setMonitorVolume] = useState(80);
  const [callerDb, setCallerDb] = useState(48);
  const [calleeDb, setCalleeDb] = useState(54);
  const [callDuration, setCallDuration] = useState(call.durationSeconds || 65);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setCallDuration((prev) => prev + 1);
      // Realistic conversational decibels
      setCallerDb(Math.floor(40 + Math.random() * 24));
      setCalleeDb(Math.floor(42 + Math.random() * 22));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Web Audio tone for realistic listening
  useEffect(() => {
    if (!isPlayingAudio) {
      if (gainRef.current) gainRef.current.gain.value = 0;
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Low subtle ambient speech carrier tone (160 Hz warm tone)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime((monitorVolume / 100) * 0.05, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;
    } catch {}

    return () => {
      try {
        oscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch {}
    };
  }, [isPlayingAudio]);

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime((monitorVolume / 100) * (isPlayingAudio ? 0.06 : 0), audioCtxRef.current.currentTime);
    }
  }, [monitorVolume, isPlayingAudio]);

  const handlePlayWarningChime = () => {
    showToast('🚨 Warning chime transmitted to both participants: "This call is monitored for community safety."');
  };

  const mins = Math.floor(callDuration / 60);
  const secs = callDuration % 60;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>🎧 Live Audio Call Monitoring</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-mono border border-indigo-500/30">
                  {call.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Supervisor Audio Tap • Live WebRTC Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Call Header Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
            {/* Caller */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={call.callerAvatar}
                  alt={call.callerName}
                  className="w-12 h-12 rounded-full border-2 border-indigo-500/50 bg-slate-800"
                />
                <span className="absolute -bottom-1 -right-1 px-1 rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                  A
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{call.callerName}</div>
                <div className="text-[10px] text-slate-400 font-mono">Caller (Male)</div>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[10px] font-mono text-emerald-400">{callerDb} dB</span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (callerDb / 80) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Callee */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={call.calleeAvatar}
                  alt={call.calleeName}
                  className="w-12 h-12 rounded-full border-2 border-rose-500/50 bg-slate-800"
                />
                <span className="absolute -bottom-1 -right-1 px-1 rounded-full bg-rose-600 text-[9px] font-bold text-white">
                  B
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{call.calleeName}</div>
                <div className="text-[10px] text-slate-400 font-mono">Callee (Female)</div>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[10px] font-mono text-rose-400">{calleeDb} dB</span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (calleeDb / 80) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Audio Frequency Spectrum</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </div>

            <div className="h-16 flex items-center justify-center space-x-1 py-2">
              {[...Array(28)].map((_, i) => {
                const height = isPlayingAudio
                  ? Math.floor(15 + Math.sin(i * 0.4 + callDuration * 2) * 12 + Math.random() * 25)
                  : 4;
                return (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 to-indigo-400 rounded-full transition-all duration-150"
                    style={{ height: `${height}px` }}
                  ></div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-400">
              <div>Codec: <span className="text-slate-200">Opus 48kHz</span></div>
              <div>Bitrate: <span className="text-emerald-400">64 kbps</span></div>
              <div>Latency: <span className="text-indigo-400">32 ms</span></div>
            </div>
          </div>

          {/* Admin Supervisor Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-bold transition ${
                    isPlayingAudio
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {isPlayingAudio ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isPlayingAudio ? 'Listening Live' : 'Muted'}</span>
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center space-x-2 w-44">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={monitorVolume}
                  onChange={(e) => setMonitorVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400 w-8">{monitorVolume}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handlePlayWarningChime}
                className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Play Warning Tone</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to terminate this live call immediately?')) {
                    onTerminate(call.id);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Force End Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VideoMonitorModalProps {
  call: CallSession;
  onClose: () => void;
  onTerminate: (callId: string) => void;
  showToast: (msg: string) => void;
}

export const VideoMonitorModal: React.FC<VideoMonitorModalProps> = ({
  call,
  onClose,
  onTerminate,
  showToast,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [callDuration, setCallDuration] = useState(call.durationSeconds || 120);

  useEffect(() => {
    const t = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(callDuration / 60);
  const secs = callDuration % 60;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>📹 Live Dual Video Monitoring (Split View)</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-mono border border-rose-500/30">
                  {call.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Admin Supervisor View • Both Participant Feeds Live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Camera Split-Screen Display */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Screen 1: Caller Feed */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col justify-between p-3 group">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-indigo-950/60 to-slate-900/90">
                <div className="relative text-center">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-rose-500 mx-auto mb-2 animate-pulse">
                    <img
                      src={call.callerAvatar}
                      alt={call.callerName}
                      className="w-full h-full rounded-full object-cover bg-slate-800"
                    />
                  </div>
                  <span className="text-xs font-bold text-white">{call.callerName}</span>
                  <div className="text-[10px] text-indigo-400 font-mono">Camera Feed • 720p @ 30fps</div>
                </div>
              </div>

              {/* Overlay Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>User A: {call.callerName}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-600/80 text-[9px] font-mono text-white">
                  CALLER
                </span>
              </div>

              {/* Overlay Bottom Stats */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/50 backdrop-blur-sm p-1.5 rounded-lg">
                <span>Bitrate: 1.2 Mbps</span>
                <span className="text-emerald-400">Audio: 52 dB</span>
              </div>
            </div>

            {/* Screen 2: Callee Feed */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col justify-between p-3 group">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-rose-950/60 to-slate-900/90">
                <div className="relative text-center">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-rose-500 to-indigo-500 mx-auto mb-2 animate-pulse">
                    <img
                      src={call.calleeAvatar}
                      alt={call.calleeName}
                      className="w-full h-full rounded-full object-cover bg-slate-800"
                    />
                  </div>
                  <span className="text-xs font-bold text-white">{call.calleeName}</span>
                  <div className="text-[10px] text-rose-400 font-mono">Camera Feed • 720p @ 30fps</div>
                </div>
              </div>

              {/* Overlay Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>User B: {call.calleeName}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-rose-600/80 text-[9px] font-mono text-white">
                  RECEIVER (FEMALE)
                </span>
              </div>

              {/* Overlay Bottom Stats */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/50 backdrop-blur-sm p-1.5 rounded-lg">
                <span>Bitrate: 1.4 Mbps</span>
                <span className="text-emerald-400">Audio: 48 dB</span>
              </div>
            </div>
          </div>

          {/* Call Metadata & Supervisor Controls */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
                <div className="text-base font-mono font-bold text-emerald-400">
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Protocol</div>
                <div className="text-xs font-mono font-bold text-white">WebRTC P2P (DTLS/SRTP)</div>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Encrypted</div>
                <div className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>AES-256</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition ${
                  isPlayingAudio
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isPlayingAudio ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
                <span>{isPlayingAudio ? 'Audio Live' : 'Audio Muted'}</span>
              </button>

              <button
                onClick={() => showToast('📸 Screenshot saved to Moderation Evidence Vault.')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Snapshot</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Force disconnect this call immediately?')) {
                    onTerminate(call.id);
                  }
                }}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-rose-600/20"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Terminate Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
