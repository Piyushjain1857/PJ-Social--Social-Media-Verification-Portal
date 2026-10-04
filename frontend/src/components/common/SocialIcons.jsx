import React from 'react';

/**
 * Official Brand Icons for Social Platforms
 * Scalable, pixel-perfect SVGs with official brand styling and colors.
 */

export function InstagramIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Instagram"
    >
      <defs>
        <radialGradient id="instagram-gradient-radial" cx="20%" cy="115%" r="130%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="5.5" fill="url(#instagram-gradient-radial)" />
      <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="3.75" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="3.2" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="15.8" cy="8.2" r="0.95" fill="#ffffff" />
    </svg>
  );
}

export function LinkedInIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="LinkedIn"
    >
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        d="M7.12 5.9a1.39 1.39 0 1 0 0 2.78 1.39 1.39 0 0 0 0-2.78zM5.73 9.87h2.78v8.94H5.73V9.87zm4.51 0h2.67v1.22h.04c.37-.7 1.28-1.44 2.63-1.44 2.81 0 3.33 1.85 3.33 4.26v4.9h-2.78v-4.35c0-1.04-.02-2.37-1.44-2.37-1.45 0-1.67 1.13-1.67 2.3v4.42h-2.78V9.87z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function TwitterXIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Twitter / X"
    >
      <rect width="24" height="24" rx="5" fill="#000000" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" />
      <path
        d="M16.99 5h2.55l-5.58 6.38 6.56 8.67h-5.14l-4.03-5.27-4.61 5.27H3.7l5.97-6.83L3.35 5h5.27l3.64 4.81L16.99 5zm-.9 13.53h1.41L7.96 6.39H6.45l9.64 12.14z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function GitHubIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="GitHub"
    >
      <rect width="24" height="24" rx="5" fill="#181717" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 3.31 2.15 6.12 5.13 7.11.37.07.51-.16.51-.36 0-.18-.01-.77-.01-1.4-1.89.35-2.37-.46-2.52-.88-.08-.22-.45-.88-.77-1.06-.26-.14-.64-.49-.01-.5.59-.01 1.02.55 1.16.78.68 1.16 1.77.83 2.21.63.07-.49.26-.83.48-1.02-1.67-.19-3.43-.84-3.43-3.73 0-.82.29-1.5.78-2.02-.08-.19-.34-.97.07-2.02 0 0 .64-.2 2.08.78.6-.17 1.25-.25 1.89-.25.64 0 1.29.08 1.89.25 1.44-.99 2.08-.78 2.08-.78.41 1.05.15 1.83.08 2.02.48.53.78 1.2.78 2.02 0 2.9-1.76 3.54-3.44 3.73.27.23.51.68.51 1.38 0 1-.01 1.8-.01 2.05 0 .2.14.44.52.36 2.97-.99 5.12-3.8 5.12-7.11 0-4.14-3.36-7.5-7.5-7.5Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function FacebookIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Facebook"
    >
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        d="M16.5 13.5l.5-3.5h-3.5V7.75c0-.95.46-1.87 1.95-1.87H17V2.97S15.65 2.75 14.36 2.75c-2.7 0-4.46 1.64-4.46 4.6V10H6.8v3.5h3.1V22h3.9v-8.5h2.7z"
        fill="#ffffff"
      />
    </svg>
  );
}

/**
 * Renders the official brand icon based on platform name string.
 */
export function PlatformIcon({ platform = '', size = 18, className = '', style = {} }) {
  const norm = String(platform || '').toUpperCase();
  if (norm.includes('INSTA')) return <InstagramIcon size={size} className={className} style={style} />;
  if (norm.includes('LINKEDIN')) return <LinkedInIcon size={size} className={className} style={style} />;
  if (norm.includes('TWITTER') || norm === 'X') return <TwitterXIcon size={size} className={className} style={style} />;
  if (norm.includes('GITHUB')) return <GitHubIcon size={size} className={className} style={style} />;
  if (norm.includes('FACEBOOK') || norm === 'FB') return <FacebookIcon size={size} className={className} style={style} />;
  if (norm.includes('TIKTOK')) return <TikTokIcon size={size} className={className} style={style} />;
  if (norm.includes('YOUTUBE') || norm === 'YT') return <YouTubeIcon size={size} className={className} style={style} />;
  return <span style={{ display: 'inline-block', ...style }}>🌐</span>;
}

export function TikTokIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="TikTok"
    >
      <rect width="24" height="24" rx="5" fill="#010101" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.8" />
      <g transform="translate(2.5, 2) scale(0.8)">
        <path
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          transform="translate(-0.5, 0.4)"
          fill="#25F4EE"
          opacity="0.9"
        />
        <path
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          transform="translate(0.5, -0.4)"
          fill="#FE2C55"
          opacity="0.9"
        />
        <path
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}

export function YouTubeIcon({ size = 22, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="YouTube"
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill="#FF0000"
      />
      <polygon points="9.545,15.568 15.818,12 9.545,8.432" fill="#ffffff" />
    </svg>
  );
}

export function CameraIcon({ size = 18, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

// Aliases
export const TwitterIcon = TwitterXIcon;
export const XIcon = TwitterXIcon;
export const YTIcon = YouTubeIcon;
