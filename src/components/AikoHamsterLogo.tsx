import React from 'react';

interface AikoLogoProps {
  className?: string;
  size?: number | string;
  color?: string; // default stroke/highlight color
  accentColor?: string; // neon red accent
  showText?: boolean;
  glow?: boolean;
}

export const AikoLogo: React.FC<AikoLogoProps> = ({
  className = '',
  size = 48,
  color = '#FFFFFF',
  accentColor = '#EF4444',
  showText = false,
  glow = true
}) => {
  const redPrimary = accentColor || '#EF4444';
  const redGlow = '#FF1E44';

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className} ${
        glow ? 'drop-shadow-[0_0_16px_rgba(255,30,68,0.55)]' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Radial Ambient Glow */}
          <radialGradient id="aikoNeonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={redGlow} stopOpacity="0.4" />
            <stop offset="50%" stopColor={redPrimary} stopOpacity="0.15" />
            <stop offset="100%" stopColor={redPrimary} stopOpacity="0" />
          </radialGradient>

          {/* Primary Letter 'A' Stem Gradient */}
          <linearGradient id="aikoStemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D6D" />
            <stop offset="30%" stopColor="#FF1E44" />
            <stop offset="70%" stopColor={redPrimary} />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>

          {/* Left Wing / Stem Edge Highlight */}
          <linearGradient id="aikoLeftEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8DA1" />
            <stop offset="40%" stopColor="#FF2E55" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>

          {/* Right Wing / Stem Edge Highlight */}
          <linearGradient id="aikoRightEdge" x1="100%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B8B" />
            <stop offset="45%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>

          {/* Dynamic Speed Swoosh Gradient */}
          <linearGradient id="aikoSwooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF1E44" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#FF1E44" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#FF3366" />
            <stop offset="85%" stopColor="#FFA3B5" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Laser Core Tube Highlight */}
          <linearGradient id="aikoLaserCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FFC2CD" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF3366" stopOpacity="0.4" />
          </linearGradient>

          {/* Radiant Star Center Glow */}
          <radialGradient id="aikoStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#FF6B8B" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#FF1E44" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF1E44" stopOpacity="0" />
          </radialGradient>

          {/* High-Performance Neon Blur Filters */}
          <filter id="aikoNeonGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="glow1" />
            <feGaussianBlur stdDeviation="16" result="glow2" />
            <feMerge>
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="starBurstFilter" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- 1. AMBIENT NEON RADIAL GLOW --- */}
        {glow && (
          <circle
            cx="250"
            cy="240"
            r="215"
            fill="url(#aikoNeonGlow)"
            className="animate-pulse"
            style={{ animationDuration: '4s' }}
          />
        )}

        {/* --- 2. THE STYLIZED 'A' BODY --- */}
        {/* Outer ambient glow halo for the 'A' */}
        <path
          d="M 250 64 L 282 86 L 398 404 L 334 422 L 274 246 L 226 246 L 166 422 L 102 404 L 218 86 Z"
          fill="none"
          stroke={redGlow}
          strokeWidth="14"
          strokeLinejoin="round"
          opacity="0.35"
          filter="url(#aikoNeonGlowFilter)"
        />

        {/* Main Solid 'A' Stems */}
        <g id="aiko-letter-A">
          {/* Main Body Silhouette */}
          <path
            d="M 250 66 L 280 88 L 395 402 L 332 420 L 272 244 L 228 244 L 168 420 L 105 402 L 220 88 Z"
            fill="url(#aikoStemGrad)"
            stroke="#991B1B"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Left Stem Cyber Blade Facet */}
          <path
            d="M 250 66 L 220 88 L 105 402 L 168 420 L 228 244 L 250 178 Z"
            fill="url(#aikoLeftEdge)"
            opacity="0.85"
          />

          {/* Right Stem Cyber Blade Facet */}
          <path
            d="M 250 66 L 280 88 L 395 402 L 332 420 L 272 244 L 250 178 Z"
            fill="url(#aikoRightEdge)"
            opacity="0.75"
          />

          {/* Inner Negative Counter (Apex Triangle Cut) */}
          <path
            d="M 250 162 L 268 222 L 232 222 Z"
            fill="#090A0F"
            stroke={redPrimary}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Neon Laser Core Beams (illuminated center lines) */}
          <line
            x1="228"
            y1="108"
            x2="148"
            y2="384"
            stroke="url(#aikoLaserCore)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#aikoNeonGlowFilter)"
          />
          <line
            x1="272"
            y1="108"
            x2="352"
            y2="384"
            stroke="url(#aikoLaserCore)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#aikoNeonGlowFilter)"
          />

          {/* Apex High-Tech Crown Diamond */}
          <polygon
            points="250,56 258,68 250,80 242,68"
            fill="#FFFFFF"
            filter="url(#starBurstFilter)"
          />
        </g>

        {/* --- 3. DYNAMIC AERODYNAMIC SWOOSH --- */}
        <g id="aiko-swoosh">
          {/* Swoosh Under-Shadow for 3D separation */}
          <path
            d="M 68 348 C 125 315 180 278 238 258 C 280 244 338 234 388 206 C 418 188 440 168 450 154 C 432 178 396 216 356 236 C 310 258 254 274 194 294 C 146 310 102 332 68 348 Z"
            fill="#05070B"
            opacity="0.6"
            transform="translate(0, 5)"
          />

          {/* Ambient Glow for the Swoosh */}
          <path
            d="M 68 348 C 125 315 180 278 238 258 C 280 244 338 234 388 206 C 418 188 440 168 450 154 C 432 178 396 216 356 236 C 310 258 254 274 194 294 C 146 310 102 332 68 348 Z"
            fill="url(#aikoSwooshGrad)"
            filter="url(#aikoNeonGlowFilter)"
            opacity="0.5"
          />

          {/* Main Swoosh Blade */}
          <path
            d="M 68 348 C 125 315 180 278 238 258 C 280 244 338 234 388 206 C 418 188 440 168 450 154 C 432 178 396 216 356 236 C 310 258 254 274 194 294 C 146 310 102 332 68 348 Z"
            fill="url(#aikoSwooshGrad)"
          />

          {/* High-Voltage Leading Ridge Light Line */}
          <path
            d="M 88 338 C 150 298 245 260 350 224 C 392 204 426 178 446 156"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#starBurstFilter)"
            opacity="0.95"
          />
        </g>

        {/* --- 4. RADIANT CYBER STAR (ESTRELLA NEÓN) --- */}
        {/* Main 4-Point Radiant Cyber Star at Swoosh Apex Crossing */}
        <g id="aiko-cyber-star" transform="translate(358, 206)">
          {/* Radial Starlight Halo */}
          <circle cx="0" cy="0" r="48" fill="url(#aikoStarGlow)" />

          {/* Secondary 45° Diamond Rays */}
          <path
            d="M 0 -28 Q 0 0 28 0 Q 0 0 0 28 Q 0 0 -28 0 Q 0 0 0 -28 Z"
            fill="#FF4D6D"
            opacity="0.8"
            transform="rotate(45)"
            filter="url(#starBurstFilter)"
          />

          {/* Primary 4-Point Star Rays */}
          <path
            d="M 0 -68 Q 0 0 68 0 Q 0 0 0 68 Q 0 0 -68 0 Q 0 0 0 -68 Z"
            fill="#FFFFFF"
            filter="url(#starBurstFilter)"
          />

          {/* Hot Core Point */}
          <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
          <circle cx="0" cy="0" r="3" fill="#FFE4E9" />
        </g>

        {/* Secondary Companion Sparkle Star (Upper-Left Shoulder) */}
        <g id="aiko-sparkle-star" transform="translate(160, 128)">
          <circle cx="0" cy="0" r="24" fill="url(#aikoStarGlow)" opacity="0.6" />
          <path
            d="M 0 -28 Q 0 0 28 0 Q 0 0 0 28 Q 0 0 -28 0 Q 0 0 0 -28 Z"
            fill="#FFFFFF"
            filter="url(#starBurstFilter)"
            opacity="0.9"
          />
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
        </g>

        {/* Optional Branding Text */}
        {showText && (
          <text
            x="250"
            y="475"
            textAnchor="middle"
            fill={color}
            fontFamily="'Outfit', 'Space Grotesk', sans-serif"
            fontSize="52"
            fontWeight="900"
            letterSpacing="26"
            className="tracking-[0.45em]"
          >
            AIKO
          </text>
        )}
      </svg>
    </div>
  );
};

// Aliases for seamless drop-in compatibility across all existing files
export const AikoHamsterLogo = AikoLogo;
export default AikoLogo;

