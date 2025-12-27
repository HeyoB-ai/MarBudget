
import React from 'react';

export const NumeraLogo: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 40 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Circle with gradient-like solid teal */}
    <circle cx="50" cy="50" r="45" fill="url(#numera_gradient)" />
    
    {/* Bars */}
    <rect x="35" y="45" width="8" height="20" fill="white" rx="1" opacity="0.6" />
    <rect x="48" y="35" width="8" height="30" fill="white" rx="1" opacity="0.8" />
    <rect x="61" y="25" width="8" height="40" fill="white" rx="1" />
    
    {/* Large Checkmark / Tick */}
    <path 
      d="M15 55L40 75L85 25" 
      stroke="white" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="drop-shadow-sm"
    />
    
    <defs>
      <linearGradient id="numera_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" /> {/* Greenish top */}
        <stop offset="0.5" stopColor="#06b6d4" /> {/* Cyan middle */}
        <stop offset="1" stopColor="#2563eb" /> {/* Blue bottom */}
      </linearGradient>
    </defs>
  </svg>
);
