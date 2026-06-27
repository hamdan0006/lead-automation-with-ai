const PROXY_ROTATION_RULES = {
  // Rotate to next proxy after this many successful requests (randomised per session)
  rotateAfter: { min: 20, max: 50 },
  // How many consecutive blocks on one proxy before forcing a rotate
  maxBlocksBeforeRotate: 2,
  // Back-off delay after a blocked response (ms) before continuing with new proxy
  blockBackoff: { min: 3000, max: 8000 },
};

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Parse env format:  host:port:username:password
 * e.g.  change4.owlproxy.com:7778:myUser_sid_123:myPass
 */
const parseProxyString = (raw) => {
  if (!raw) return null;
  const str = raw.trim().replace(/[`\s]/g, '');
  const parts = str.split(':');
  if (parts.length < 4) return null;
  const host     = parts[0];
  const port     = parts[1];
  const password = parts[parts.length - 1];
  const username = parts.slice(2, parts.length - 1).join(':');
  return { host, port, username, password };
};

const loadProxies = () => {
  const proxies = [];
  for (let i = 1; i <= 5; i++) {
    const p = parseProxyString(process.env[`FMCSA_PROXY_URL${i}`]);
    if (p) proxies.push(p);
  }
  return proxies;
};

class ProxyRotator {
  constructor(proxies) {
    this.proxies  = proxies;
    this.index    = 0;
    this.count    = 0;
    this._limit   = getRandomInt(PROXY_ROTATION_RULES.rotateAfter.min, PROXY_ROTATION_RULES.rotateAfter.max);
    this.blocks   = 0;
    this.rotated  = false; // true for exactly one tick after a rotation
  }

  get current() {
    return this.proxies[this.index] || null;
  }

  get total() {
    return this.proxies.length;
  }

  /** Call after every outbound request. */
  tick() {
    this.rotated = false;
    this.count++;
    if (this.count >= this._limit) this._rotate('scheduled');
  }

  /** Call when the site returns a blocked / CAPTCHA response. */
  onBlock() {
    this.rotated = false;
    this.blocks++;
    if (this.blocks >= PROXY_ROTATION_RULES.maxBlocksBeforeRotate) {
      this._rotate('blocked');
      this.blocks = 0;
    }
  }

  /** Call on a successful data extraction. */
  onSuccess() {
    this.blocks = 0;
  }

  _rotate(reason) {
    const prev   = this.index;
    this.index   = (this.index + 1) % this.proxies.length;
    this.count   = 0;
    this._limit  = getRandomInt(PROXY_ROTATION_RULES.rotateAfter.min, PROXY_ROTATION_RULES.rotateAfter.max);
    this.rotated = true;
    return { from: prev + 1, to: this.index + 1, reason };
  }
}

module.exports = { PROXY_ROTATION_RULES, loadProxies, ProxyRotator, getRandomInt };
