const rules = {
  // Number of leads to extract per run
  leadsPerRun: {
    min: 80,
    max: 120
  },
  
  // Target for high-volume scraping (300+ leads)
  highVolumeTarget: {
    min: 300,
    max: 350
  },
  
  // Scroller rules
  scroll: {
    // How many pixels to scroll per step (randomized to prevent bot signals)
    step: {
      min: 300,
      max: 800
    },
    
    // Short delays between manual scroll steps (in ms)
    shortDelay: {
      min: 2000,
      max: 5000
    },
    
    // Long pause (in ms)
    longPause: {
      min: 30000,
      max: 90000
    },
    
    // Trigger long pause after X scrolls (e.g., highly irregular: 20-50, or sometimes we just skip depending on randomness)
    triggerLongPauseAfter: {
      min: 20,
      max: 50
    }
  },

  // Gap between different scraping jobs (in ms) to prevent cluster detection
  batchGap: {
    min: 120000, // 2 minutes
    max: 240000  // 4 minutes
  },
  
  // Captcha detection
  captcha: {
    checkInterval: 5, // Check every 5 scrolls
    selectors: [
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '#captcha',
      '.g-recaptcha'
    ]
  },
  
  // Rate limit detection
  rateLimit: {
    slowResponseThreshold: 10000, // 10s response time
    adaptiveDelay: {
      min: 5000,
      max: 10000
    }
  }
};

// Helper function to get random integer between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ── Google Maps proxy rotation ───────────────────────────────────────────────

const GMAP_PROXY_RULES = {
  // Each scraping job gets the next proxy in round-robin order
  rotatePerJob: true,
  // Rotate immediately when a CAPTCHA is detected mid-job
  rotatOnCaptcha: true,
  // Back-off before relaunching with new proxy after CAPTCHA (ms)
  captchaBackoff: { min: 5000, max: 12000 },
};

// Parse env format:  host:port:username:password
const _parseProxyStr = (raw) => {
  if (!raw) return null;
  const str   = raw.trim().replace(/[`\s]/g, '');
  const parts = str.split(':');
  if (parts.length < 4) return null;
  const host     = parts[0];
  const port     = parts[1];
  const password = parts[parts.length - 1];
  const username = parts.slice(2, parts.length - 1).join(':');
  return { host, port, username, password };
};

const loadGmapProxies = () => {
  const proxies = [];
  for (let i = 1; i <= 5; i++) {
    const p = _parseProxyStr(process.env[`FMCSA_PROXY_URL_GMAP${i}`]);
    if (p) proxies.push(p);
  }
  return proxies;
};

class GmapProxyRotator {
  constructor(proxies) {
    this.proxies = proxies;
    this.index   = 0;
  }

  get total() { return this.proxies.length; }

  /**
   * Returns the current proxy and advances the index for the next call.
   * Use at the start of every job so each job gets a fresh proxy.
   */
  next() {
    const proxy = this.proxies[this.index];
    this.index  = (this.index + 1) % this.proxies.length;
    return proxy;
  }

  /** Peek without advancing (useful for logging). */
  get current() { return this.proxies[this.index] || null; }
}

module.exports = {
  rules,
  getRandomInt,
  GMAP_PROXY_RULES,
  loadGmapProxies,
  GmapProxyRotator,
};
