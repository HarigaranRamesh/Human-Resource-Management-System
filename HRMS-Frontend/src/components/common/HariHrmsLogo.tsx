import React from 'react';

interface HariHrmsLogoProps {
  size?: number;
  showText?: boolean;
  animated?: boolean;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
}

/**
 * Official HARI HRMS Vector Brand Logo & Monogram
 * Palette: Navy (#2F4156) · Teal (#567C8D) · Sky Blue (#C8D9E6) · Ice-Blue (#E7EEF6)
 */
export const HariHrmsLogo: React.FC<HariHrmsLogoProps> = React.memo(({
  size = 40,
  showText = false,
  animated = false,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: showText ? '10px' : '0' }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 120 120"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={animated ? 'hari-logo-animated' : ''}
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Primary Brand Gradients */}
            <linearGradient id="hariNavyTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2F4156" />
              <stop offset="60%" stopColor="#3d5869" />
              <stop offset="100%" stopColor="#567C8D" />
            </linearGradient>

            <linearGradient id="hariSkyTeal" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#567C8D" />
              <stop offset="100%" stopColor="#C8D9E6" />
            </linearGradient>

            <linearGradient id="hariAccentGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C8D9E6" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>

            {/* Subtle Drop Shadow */}
            <filter id="hariGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2F4156" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background Squircle Shield */}
          <rect
            x="8"
            y="8"
            width="104"
            height="104"
            rx="30"
            fill="url(#hariNavyTeal)"
            filter="url(#hariGlow)"
          />

          {/* Frosted Border Highlight */}
          <rect
            x="8.75"
            y="8.75"
            width="102.5"
            height="102.5"
            rx="29.25"
            stroke="url(#hariSkyTeal)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />

          {/* Interlocking Monogram "N" (NIRALIX) + Dynamic Person Core */}
          {/* Left Vertical Pillar */}
          <path
            d="M34 32C34 29.7909 35.7909 28 38 28H44C46.2091 28 48 29.7909 48 32V88C48 90.2091 46.2091 92 44 92H38C35.7909 92 34 90.2091 34 88V32Z"
            fill="#FFFFFF"
          />

          {/* Right Vertical Pillar */}
          <path
            d="M72 32C72 29.7909 73.7909 28 76 28H82C84.2091 28 86 29.7909 86 32V88C86 90.2091 84.2091 92 82 92H76C73.7909 92 72 90.2091 72 88V32Z"
            fill="url(#hariSkyTeal)"
          />

          {/* Dynamic Diagonal Bridge for "N" Monogram */}
          <path
            d="M44 32L76 86C77.5 88.5 76 92 73 92H67C65.5 92 64.2 91.2 63.4 90L37 42C35.5 39.5 37 36 40 36H44V32Z"
            fill="url(#hariAccentGold)"
            opacity="0.95"
          />

          {/* Top Center Emblem Sphere (Leadership Core) */}
          <circle cx="60" cy="38" r="6" fill="#FFFFFF" />

          {/* Micro Sparkle Star (Top Right) */}
          <path
            d="M92 20L93.5 24.5L98 26L93.5 27.5L92 32L90.5 27.5L86 26L90.5 24.5L92 20Z"
            fill="#C8D9E6"
            opacity="0.8"
          />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span
              style={{
                fontSize: size * 0.44,
                fontWeight: 900,
                color: 'var(--primary, #567C8D)',
                letterSpacing: '-0.02em',
              }}
            >
              NIRALIX
            </span>
            <span
              style={{
                fontSize: size * 0.44,
                fontWeight: 800,
                color: 'var(--text, #2F4156)',
                letterSpacing: '-0.01em',
              }}
            >
              HRMS
            </span>
          </div>
          <span
            style={{
              fontSize: Math.max(9, size * 0.2),
              fontWeight: 700,
              color: 'var(--text-secondary, #8da4b0)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Enterprise Cloud
          </span>
        </div>
      )}
    </div>
  );
});

HariHrmsLogo.displayName = 'HariHrmsLogo';

/**
 * Brand Animated Loading Screen:
 * Centers in the page with a slight backdrop blur over the background content.
 */
export const BrandLoader: React.FC<{
  size?: number;
  message?: string;
  fullPage?: boolean;
}> = React.memo(({
  size = 56,
  message = 'Loading NIRALIX HRMS...',
  fullPage = true,
}) => {
  return (
    <div
      className="hari-page-blur-overlay"
      style={{
        position: fullPage ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(231, 238, 246, 0.55)',
        backdropFilter: 'blur(9px) saturate(140%)',
        WebkitBackdropFilter: 'blur(9px) saturate(140%)',
        zIndex: 9999,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Floating Centered Glassmorphic Loading Card */}
      <div
        className="hari-loader-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.25rem 3rem',
          borderRadius: '26px',
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(86, 124, 141, 0.28)',
          boxShadow: '0 24px 60px -12px rgba(47, 65, 86, 0.22), inset 0 1px 2px rgba(255, 255, 255, 0.85)',
          gap: '14px',
          animation: 'hariCardFloat 3s ease-in-out infinite',
        }}
      >
        {/* Animated Brand Monogram */}
        <div className="hari-loader-wrap" style={{ position: 'relative' }}>
          <HariHrmsLogo size={size} animated={true} />
          {/* Pulsing Aura Ring */}
          <div className="hari-loader-ring" />
        </div>

        {/* Monogram Brand Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '4px' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary, #567C8D)', letterSpacing: '-0.02em' }}>
            NIRALIX
          </span>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text, #2F4156)', letterSpacing: '-0.01em' }}>
            HRMS
          </span>
        </div>

        {/* Micro-loading message with animated dots */}
        {message && (
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary, #567C8D)',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{message}</span>
            <span className="hari-loading-dots">
              <span className="hari-dot dot-1" />
              <span className="hari-dot dot-2" />
              <span className="hari-dot dot-3" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

BrandLoader.displayName = 'BrandLoader';

/**
 * Reusable LoadingOverlay component for cards or containers
 */
export const LoadingOverlay: React.FC<{
  visible: boolean;
  message?: string;
  size?: number;
}> = React.memo(({ visible, message = 'Loading...', size = 44 }) => {
  if (!visible) return null;
  return <BrandLoader size={size} message={message} fullPage={false} />;
});

LoadingOverlay.displayName = 'LoadingOverlay';

export const NiralixHrmsLogo = HariHrmsLogo;
export default HariHrmsLogo;
