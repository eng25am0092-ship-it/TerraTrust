import React from 'react';
import type { ConsistencyCategory } from '../types/verification';

interface ConsistencyGaugeProps {
  score: number;
  category: ConsistencyCategory;
}

export const ConsistencyGauge: React.FC<ConsistencyGaugeProps> = ({ score, category }) => {
  const clamped = Math.max(0, Math.min(100, score));

  let strokeColor = '#B91C1C'; // 0-39 Significant inconsistencies
  let textColor = 'text-[#B91C1C]';
  if (clamped >= 80) {
    strokeColor = '#15803D';
    textColor = 'text-[#15803D]';
  } else if (clamped >= 60) {
    strokeColor = '#166534';
    textColor = 'text-[#166534]';
  } else if (clamped >= 40) {
    strokeColor = '#B45309';
    textColor = 'text-[#B45309]';
  }

  // Semicircle geometry
  const radius = 84;
  const cx = 110;
  const cy = 104;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px] h-[126px]">
        <svg viewBox="0 0 220 124" className="w-full h-full overflow-visible" role="img" aria-label={`TerraTrust consistency score ${clamped} out of 100: ${category}`}>
          {/* Track Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#E2E8E4"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          {/* Scale Markers */}
          <text x="20" y="120" className="fill-[#6A7B72] text-[10px] font-mono">
            0
          </text>
          <text x="103" y="12" className="fill-[#6A7B72] text-[10px] font-mono">
            50
          </text>
          <text x="188" y="120" className="fill-[#6A7B72] text-[10px] font-mono">
            100
          </text>
        </svg>

        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
          <span className="font-mono text-4xl font-semibold tracking-tight text-[#0F1F17] tabular-nums">
            {clamped}
          </span>
          <span className="text-xs text-[#6A7B72] font-mono">out of 100</span>
        </div>
      </div>

      <p className={`mt-2 text-sm font-semibold ${textColor}`}>{category}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#5B6D63]">
        <span>80–100: High consistency</span>
        <span>60–79: Moderate consistency</span>
        <span>40–59: Low consistency</span>
        <span>0–39: Significant gaps</span>
      </div>
    </div>
  );
};
