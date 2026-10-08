import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';
import { LanguageStrings } from '../../utils/i18n';

interface RealtimeCallWaveformProps {
  isMuted: boolean;
  strings?: LanguageStrings;
  lang?: 'te' | 'en';
}

export const RealtimeCallWaveform: React.FC<RealtimeCallWaveformProps> = ({
  isMuted,
  lang = 'te',
}) => {
  const BAR_COUNT = 24;
  const [waveJitter, setWaveJitter] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.4)
  );

  useEffect(() => {
    if (isMuted) return;

    const interval = setInterval(() => {
      setWaveJitter(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
          const voiceWeight = 1 - centerDist * 0.5;
          const randomFactor = 0.3 + Math.random() * 0.8;
          return Math.max(0.15, Math.min(1.2, voiceWeight * randomFactor));
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isMuted, BAR_COUNT]);

  return (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center mt-3 select-none">
      {/* Waveform Visualization Container */}
      <div className="relative w-full h-14 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 px-4 py-2 flex flex-col justify-center overflow-hidden">
        {/* Dynamic Amplitude Bars */}
        <div className="flex items-end justify-between w-full h-9 gap-1">
          {waveJitter.map((jitter, idx) => {
            const targetHeight = isMuted ? 4 : Math.max(6, Math.round(jitter * 34));

            return (
              <motion.div
                key={idx}
                animate={{ height: `${targetHeight}px` }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                className={`flex-1 rounded-full ${
                  isMuted
                    ? 'bg-slate-700'
                    : 'bg-gradient-to-t from-rose-500 via-pink-500 to-indigo-400'
                }`}
                style={{
                  opacity: isMuted ? 0.3 : Math.max(0.5, jitter),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Mic status */}
      <div className="flex items-center justify-center w-full mt-2">
        {isMuted ? (
          <div className="flex items-center space-x-1 text-rose-400 text-[10px] font-medium">
            <MicOff className="w-3 h-3" />
            <span>{lang === 'te' ? 'మైక్ మ్యూట్ చేయబడింది' : 'Microphone Muted'}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === 'te' ? 'వాయిస్ కనెక్ట్ అయింది' : 'Voice Connected'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
