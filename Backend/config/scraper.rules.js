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

module.exports = {
  rules,
  getRandomInt
};
