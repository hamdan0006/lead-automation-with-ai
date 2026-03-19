const mailerRules = {
  // Delay between individual emails (in ms)
  // Default: 2-5 minutes to look human
  delayBetweenEmails: {
    min: 120000, // 2 minutes
    max: 300000  // 5 minutes
  },

  // How many emails to send before taking a "coffee break"
  triggerLongPauseAfter: {
    min: 10,
    max: 20
  },

  // Duration of the "coffee break" (in ms)
  longPause: {
    min: 600000,  // 10 minutes
    max: 1200000  // 20 minutes
  }
};

/**
 * Helper to get random integer between min and max
 */
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = {
  mailerRules,
  getRandomInt
};
