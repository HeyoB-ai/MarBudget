
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
    {/* Circle with premium gradient */}
    <circle cx="50" cy="50" r="46" fill="url(#numera_gradient_new)" />
    
    {/* Clean Bars */}
    <rect x="34" y="48" width="8" height="18" fill="white" rx="1.5" opacity="0.6" />
    <rect x="47" y="38" width="8" height="28" fill="white" rx="1.5" opacity="0.8" />
    <rect x="60" y="28" width="8" height="38" fill="white" rx="1.5" />
    
    {/* Sharp Checkmark / Tick - precisely matching the uploaded style */}
    <path 
      d="M18 58L40 78L88 30" 
      stroke="white" 
      strokeWidth="11" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="drop-shadow-md"
    />
    
    <defs>
      <linearGradient id="numera_gradient_new" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" /> {/* Greenish top */}
        <stop offset="0.45" stopColor="#06b6d4" /> {/* Cyan middle */}
        <stop offset="1" stopColor="#2563eb" /> {/* Blue bottom */}
      </linearGradient>
    </defs>
  </svg>
);
