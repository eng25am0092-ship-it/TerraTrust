import React from 'react';

interface TerraTrustLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { icon: 22, text: 'text-base' },
  md: { icon: 26, text: 'text-lg' },
  lg: { icon: 32, text: 'text-xl' },
};

export const TerraTrustLogo: React.FC<TerraTrustLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const { icon, text } = SIZE_MAP[size];

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Minimalist Globe Perimeter (Forest Green) */}
        <circle
          cx="15"
          cy="16"
          r="11.5"
          stroke="#14532D"
          strokeWidth="2"
        />
        {/* Globe Latitude & Meridian Arcs (Muted Teal) */}
        <path
          d="M4.2 16H21.5"
          stroke="#0F766E"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M15 4.5C11.7 8 10.5 12 10.5 16C10.5 20 11.7 24 15 27.5"
          stroke="#0F766E"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M6.8 10.2C9.5 11.4 12.2 12 15 12"
          stroke="#0F766E"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* Integrated Botanical Leaf emerging from the Globe */}
        <path
          d="M14.5 22.5C14.5 15.8 19.6 10.8 27.5 10.5C27.2 18.2 22.4 23 15.8 23"
          fill="#14532D"
          fillOpacity="0.14"
          stroke="#14532D"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Central Leaf Midrib Accent (Muted Teal) */}
        <path
          d="M14.5 22.5C17.8 18.8 21.2 15.6 25.2 12.6"
          stroke="#0F766E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark && (
        <span className={`font-display font-bold tracking-tight text-[#0F1F17] ${text}`}>
          Terra<span className="text-[#14532D]">Trust</span>
        </span>
      )}
    </span>
  );
};
