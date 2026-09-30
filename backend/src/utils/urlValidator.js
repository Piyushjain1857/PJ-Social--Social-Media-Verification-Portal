/**
 * URL and Domain Validation Utilities for Official Social Media Accounts
 */

const VALID_PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'];

/**
 * Validate that an account URL belongs to the official platform domain.
 * Prevents arbitrary websites or rogue handles from being masqueraded as official college accounts.
 *
 * @param {string} platform - 'INSTAGRAM' | 'LINKEDIN' | 'FACEBOOK'
 * @param {string} urlString - Target URL
 * @returns {{ valid: boolean, message?: string, cleanUrl?: string, inferredHandle?: string }}
 */
const validateOfficialAccountUrl = (platform, urlString) => {
  if (!platform || !VALID_PLATFORMS.includes(platform.toUpperCase())) {
    return {
      valid: false,
      message: `Platform must be one of: ${VALID_PLATFORMS.join(', ')}`
    };
  }

  if (!urlString || typeof urlString !== 'string' || !urlString.trim()) {
    return {
      valid: false,
      message: 'Account URL is required.'
    };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return {
      valid: false,
      message: 'Invalid URL format. Please provide a complete, well-formed URL (e.g. https://instagram.com/apex_university).'
    };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      valid: false,
      message: 'URL must use the HTTP or HTTPS protocol.'
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const targetPlatform = platform.toUpperCase();

  if (targetPlatform === 'INSTAGRAM') {
    if (hostname !== 'instagram.com' && !hostname.endsWith('.instagram.com')) {
      return {
        valid: false,
        message: 'Invalid URL domain. Official Instagram accounts must use the instagram.com domain (e.g. https://instagram.com/apex_university).'
      };
    }
  } else if (targetPlatform === 'LINKEDIN') {
    if (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) {
      return {
        valid: false,
        message: 'Invalid URL domain. Official LinkedIn accounts must use the linkedin.com domain (e.g. https://linkedin.com/school/apex-university).'
      };
    }
  } else if (targetPlatform === 'FACEBOOK') {
    if (hostname !== 'facebook.com' && !hostname.endsWith('.facebook.com') && hostname !== 'fb.com') {
      return {
        valid: false,
        message: 'Invalid URL domain. Official Facebook accounts must use the facebook.com or fb.com domain (e.g. https://facebook.com/apexuniversity).'
      };
    }
  }

  // Pathname must not be empty or just root '/'
  const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
  if (!cleanPath) {
    return {
      valid: false,
      message: 'URL must point to a specific profile, school page, or handle, not the homepage.'
    };
  }

  // Infer handle from path
  const segments = cleanPath.split('/').filter(Boolean);
  let inferredHandle = '';
  if (targetPlatform === 'LINKEDIN') {
    if ((segments[0] === 'school' || segments[0] === 'company') && segments[1]) {
      inferredHandle = segments[1];
    } else {
      inferredHandle = segments[0];
    }
  } else {
    inferredHandle = segments[0].replace(/^@/, '');
  }

  return {
    valid: true,
    cleanUrl: parsed.toString(),
    inferredHandle
  };
};

/**
 * Validate that a user's submission postUrl belongs to the target platform domain
 *
 * @param {string} platform - 'INSTAGRAM' | 'LINKEDIN' | 'FACEBOOK'
 * @param {string} postUrl - Target post URL
 * @returns {{ valid: boolean, message?: string, cleanUrl?: string }}
 */
const validateSubmissionPostUrl = (platform, postUrl) => {
  if (!platform || !VALID_PLATFORMS.includes(platform.toUpperCase())) {
    return {
      valid: false,
      message: `Platform must be one of: ${VALID_PLATFORMS.join(', ')}`
    };
  }

  if (!postUrl || typeof postUrl !== 'string' || !postUrl.trim()) {
    return {
      valid: false,
      message: 'A post or activity URL is required.'
    };
  }

  let parsed;
  try {
    parsed = new URL(postUrl.trim());
  } catch {
    return {
      valid: false,
      message: 'Invalid URL format. Please provide a complete, well-formed URL (e.g. https://instagram.com/p/...).'
    };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      valid: false,
      message: 'URL must use the HTTP or HTTPS protocol.'
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const targetPlatform = platform.toUpperCase();

  if (targetPlatform === 'INSTAGRAM') {
    if (hostname !== 'instagram.com' && !hostname.endsWith('.instagram.com')) {
      return {
        valid: false,
        message: 'Invalid post URL. Instagram activities must be on the instagram.com domain (e.g. https://instagram.com/p/...).'
      };
    }
  } else if (targetPlatform === 'LINKEDIN') {
    if (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) {
      return {
        valid: false,
        message: 'Invalid post URL. LinkedIn activities must be on the linkedin.com domain (e.g. https://linkedin.com/feed/update/...).'
      };
    }
  } else if (targetPlatform === 'FACEBOOK') {
    if (hostname !== 'facebook.com' && !hostname.endsWith('.facebook.com') && hostname !== 'fb.com') {
      return {
        valid: false,
        message: 'Invalid post URL. Facebook activities must be on the facebook.com or fb.com domain.'
      };
    }
  }

  const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
  if (!cleanPath) {
    return {
      valid: false,
      message: 'Post URL must point to a specific post, comment, or story, not just the homepage.'
    };
  }

  return {
    valid: true,
    cleanUrl: parsed.toString()
  };
};

module.exports = {
  VALID_PLATFORMS,
  validateOfficialAccountUrl,
  validateSubmissionPostUrl
};
