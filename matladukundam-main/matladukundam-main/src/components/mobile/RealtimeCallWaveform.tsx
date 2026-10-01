import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Sliders, Volume2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LanguageStrings } from '../../utils/i18n';

interface RealtimeCallWaveformProps {
  ambientNoiseDb: number;
  micSensitivity: number;
  isMuted: boolean;
  isHeadphonesOn: boolean;
  strings: LanguageStrings;
  lang: 'te' | 'en';
  onAdjustSensitivity: (delta: number) => void;
  onOpenAudioSettings: () => void;
}

export const RealtimeCallWaveform: React.FC<RealtimeCallWaveformProps> = ({
  ambientNoiseDb,
  micSensitivity,
  isMuted,
  isHeadphonesOn,
  strings,
  lang,
  onAdjustSensitivity,
  onOpenAudioSettings,
}) => {
  // 24 animated frequency/amplitude bars
  const BAR_COUNT = 24;
  const [waveJitter, setWaveJitter] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.5)
  );

  // Dynamic animation tick rate: faster jittering at higher decibel volumes
  useEffect(() => {
    if (isMuted) return;

    const tickRate = ambientNoiseDb >= 70 ? 75 : ambientNoiseDb >= 55 ? 95 : 120;
    const interval = setInterval(() => {
      setWaveJitter(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          // Center-weighted Gaussian curve (voice resonance peaks in the middle)
          const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
          const voiceWeight = 1 - centerDist * 0.55;
          const randomFactor = 0.45 + Math.random() * 0.9;
          return Math.max(0.1, Math.min(1.3, voiceWeight * randomFactor));
        })
      );
    }, tickRate);

    return () => clearInterval(interval);
  }, [isMuted, BAR_COUNT, ambientNoiseDb]);

  // Compute normalized amplitude (0.05 to 1.0)
  const normalizedAmplitude = useMemo(() => {
    if (isMuted) return 0.05;
    // Base loudness calculated from dB (scale: 25 dB -> 0.1, 70 dB -> 0.75, 90 dB -> 1.0)
    const dbFactor = Math.max(0, (ambientNoiseDb - 25) / 65);
    const sensFactor = micSensitivity / 100;
    return Math.min(1.0, Math.max(0.1, dbFactor * sensFactor));
  }, [isMuted, ambientNoiseDb, micSensitivity]);

  // Determine safety color tier based on proximity to 70 dB noise warning threshold
  const statusTier = useMemo(() => {
    if (isMuted) return 'muted';
    if (ambientNoiseDb >= 70) return 'danger';
    if (ambientNoiseDb >= 58) return 'warning';
    return 'optimal';
  }, [isMuted, ambientNoiseDb]);

  // Dynamic pulsation parameters directly reacting to ambientNoiseDb:
  // Duration: 1.4s at 30 dB down to 0.35s at 85+ dB (faster as noise grows)
  const pulseDuration = useMemo(() => {
    if (isMuted) return 2.2;
    const clampedDb = Math.max(30, Math.min(90, ambientNoiseDb));
    const factor = (clampedDb - 30) / 60;
    return +(1.4 - factor * 1.05).toFixed(2);
  }, [isMuted, ambientNoiseDb]);

  // Scale expansion: 1.01 at 30 dB up to 1.06 at 90 dB
  const pulseScaleMax = useMemo(() => {
    if (isMuted) return 1.0;
    const clampedDb = Math.max(30, Math.min(90, ambientNoiseDb));
    const factor = (clampedDb - 30) / 60;
    return +(1.01 + factor * 0.05).toFixed(3);
  }, [isMuted, ambientNoiseDb]);

  // Dynamic box-shadow glow intensity scaling with ambientNoiseDb
  const glowShadow = useMemo(() => {
    if (isMuted) return '0 0 0px transparent';
    const clampedDb = Math.max(30, Math.min(90, ambientNoiseDb));
    const spread = Math.round(8 + (clampedDb - 30) * 0.35);
    if (ambientNoiseDb >= 70) {
      return `0 0 ${spread}px rgba(244, 63, 94, 0.65), inset 0 0 14px rgba(244, 63, 94, 0.25)`;
    }
    if (ambientNoiseDb >= 58) {
      return `0 0 ${spread}px rgba(245, 158, 11, 0.5), inset 0 0 10px rgba(245, 158, 11, 0.15)`;
    }
    return `0 0 ${spread}px rgba(99, 102, 241, 0.4), inset 0 0 8px rgba(99, 102, 241, 0.15)`;
  }, [isMuted, ambientNoiseDb]);

  const barColorClass = useMemo(() => {
    switch (statusTier) {
      case 'muted':
        return 'from-slate-700 to-slate-600';
      case 'danger':
        return 'from-amber-500 to-rose-500 shadow-rose-500/50';
      case 'warning':
        return 'from-emerald-400 to-amber-400 shadow-amber-500/40';
      case 'optimal':
      default:
        return 'from-teal-400 to-indigo-500 shadow-indigo-500/30';
    }
  }, [statusTier]);

  return (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center mt-3 select-none relative">
      {/* Dynamic Ambient Glow Aura pulsing more intensely with louder ambient volume */}
      <motion.div
        key={`pulse-aura-${statusTier}`}
        className="absolute -inset-1.5 rounded-3xl pointer-events-none -z-10"
        animate={{
          scale: isMuted ? 1 : [1, pulseScaleMax * 1.03, 1],
          opacity: isMuted ? 0 : [0.3, Math.min(0.95, 0.4 + (ambientNoiseDb / 100) * 0.5), 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: pulseDuration,
          ease: 'easeInOut',
        }}
        style={{
          background:
            statusTier === 'danger'
              ? 'radial-gradient(ellipse at center, rgba(244,63,94,0.35) 0%, rgba(244,63,94,0) 72%)'
              : statusTier === 'warning'
              ? 'radial-gradient(ellipse at center, rgba(245,158,11,0.28) 0%, rgba(245,158,11,0) 72%)'
              : 'radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0) 72%)',
        }}
      />

      {/* Waveform Visualization Container with Framer-Motion Dynamic Pulse */}
      <motion.div
        animate={{
          scale: isMuted ? 1 : [1, pulseScaleMax, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: pulseDuration,
          ease: 'easeInOut',
        }}
        style={{
          boxShadow: glowShadow,
        }}
        className={`relative w-full h-16 bg-slate-950/70 backdrop-blur-md rounded-2xl border px-3 py-2 flex flex-col justify-end overflow-hidden transition-colors duration-300 ${
          statusTier === 'danger'
            ? 'border-rose-500/70'
            : statusTier === 'warning'
            ? 'border-amber-500/60'
            : 'border-slate-800/90'
        }`}
      >
        {/* Visual Threshold Warning Line at 70 dB (~75% height) */}
        <div
          className="absolute left-3 right-3 top-[25%] border-b border-dashed border-rose-500/35 flex items-center justify-between pointer-events-none z-10"
          title="Noise Warning Threshold (70 dB)"
        >
          <span className="text-[8px] font-mono font-bold text-rose-400/90 bg-slate-950/90 px-1 rounded">
            70 dB Threshold
          </span>
          <span className="text-[8px] font-mono text-slate-400 flex items-center space-x-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor:
                  statusTier === 'danger'
                    ? '#f43f5e'
                    : statusTier === 'warning'
                    ? '#f59e0b'
                    : '#10b981',
              }}
            />
            <span>
              {statusTier === 'danger' ? '⚠️ High' : statusTier === 'warning' ? '⚡ Caution' : '✓ Safe'}
            </span>
          </span>
        </div>

        {/* Dynamic Amplitude Bars pulsing with frequency jitter and height response */}
        <div className="flex items-end justify-between w-full h-10 gap-0.5 z-0">
          {waveJitter.map((jitter, idx) => {
            const targetHeight = isMuted
              ? 4
              : Math.max(5, Math.min(42, normalizedAmplitude * jitter * 46));

            return (
              <motion.div
                key={idx}
                animate={{ height: `${targetHeight}px` }}
                transition={{ duration: Math.max(0.06, pulseDuration * 0.18), ease: 'easeOut' }}
                className={`flex-1 rounded-full bg-gradient-to-t ${barColorClass} transition-colors duration-200`}
                style={{
                  opacity: isMuted ? 0.35 : Math.max(0.65, jitter),
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Real-time Status Feedback Pill & Threshold Warning Proximity */}
      <div className="flex items-center justify-between w-full mt-2 px-1">
        <div className="flex items-center space-x-1.5">
          {isMuted ? (
            <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
              <MicOff className="w-3 h-3 text-rose-400" />
              <span>{lang === 'te' ? 'మైక్ మ్యూట్ చేయబడింది' : 'Mic Muted'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-[10px] font-semibold">
              <motion.span
                animate={{
                  scale: statusTier === 'danger' ? [1, 1.45, 1] : statusTier === 'warning' ? [1, 1.25, 1] : [1, 1.15, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ repeat: Infinity, duration: pulseDuration, ease: 'easeInOut' }}
                className={`w-2 h-2 rounded-full ${
                  statusTier === 'danger'
                    ? 'bg-rose-500 shadow-sm shadow-rose-500'
                    : statusTier === 'warning'
                    ? 'bg-amber-400 shadow-sm shadow-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span
                className={
                  statusTier === 'danger'
                    ? 'text-rose-300'
                    : statusTier === 'warning'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }
              >
                {ambientNoiseDb} dB •{' '}
                {statusTier === 'danger'
                  ? lang === 'te'
                    ? 'అధిక శబ్దం'
                    : 'Warning Level'
                  : statusTier === 'warning'
                  ? lang === 'te'
                    ? 'మధ్యస్థ స్థాయి'
                    : 'Moderate Level'
                  : lang === 'te'
                  ? 'స్పష్టమైన వాయిస్'
                  : 'Clean Audio'}
              </span>
            </div>
          )}
        </div>

        {/* Quick Sensitivity Control buttons to let user proactively adjust before the warning */}
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 rounded-lg px-1.5 py-0.5">
          <span className="text-[9px] text-slate-400 font-mono">Sens:</span>
          <button
            id="btn-sens-decrease"
            onClick={() => onAdjustSensitivity(-10)}
            disabled={micSensitivity <= 20}
            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold disabled:opacity-40 transition"
            title="Decrease Sensitivity"
          >
            -
          </button>
          <span className="text-[10px] font-mono font-bold text-indigo-300 px-0.5 min-w-[24px] text-center">
            {micSensitivity}%
          </span>
          <button
            id="btn-sens-increase"
            onClick={() => onAdjustSensitivity(10)}
            disabled={micSensitivity >= 100}
            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold disabled:opacity-40 transition"
            title="Increase Sensitivity"
          >
            +
          </button>
          <button
            id="btn-open-audio-settings-waveform"
            onClick={onOpenAudioSettings}
            className="ml-0.5 text-slate-400 hover:text-amber-300 transition"
            title="Advanced Audio Tuning"
          >
            <Sliders className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
