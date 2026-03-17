/**
 * Parses a Google Maps address string into structured fields.
 *
 * Google Maps address formats:
 *   4 parts: "700 NE 90th St, Miami, FL 33138, United States"
 *   5 parts: "Causeway Square, 1801 NE 123rd St Ste 314, North Miami, FL 33181, United States"
 *
 * Returns: { area, street, city, state, zip, country }
 */
const parseAddress = (rawAddress) => {
  if (!rawAddress) {
    return { area: null, city: null, state: null, country: null };
  }

  // Clean up emoji/icon characters and extra newlines injected by Google Maps DOM
  // e.g. "εâê\n700 NE 90th St..." → "700 NE 90th St..."
  const cleaned = rawAddress
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')  // Remove emoji
    .replace(/[^\x00-\x7F\u00C0-\u024F]/g, '') // Remove other non-standard chars
    .replace(/\n/g, ', ')  // Replace newlines with comma separator
    .replace(/,\s*,/g, ',')  // Remove doubled commas
    .trim();

  // Split by ", "
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length < 3) {
    // Not enough data to parse meaningfully
    return { area: null, city: null, state: null, country: null };
  }

  // Country is always last
  const country = parts[parts.length - 1];

  // State + ZIP is always second to last (e.g. "FL 33181")
  const stateZip = parts[parts.length - 2];
  const stateMatch = stateZip.match(/^([A-Z]{2})\s+\d+/);
  const state = stateMatch ? stateMatch[1] : stateZip;

  // City is always third to last
  const city = parts[parts.length - 3];

  // If 5+ parts → the very first part is the area/building name
  // e.g. "Causeway Square" in "Causeway Square, 1801 NE 123rd St..., City, FL ZIP, Country"
  let area = null;
  if (parts.length >= 5) {
    area = parts[0];
  }

  return { area, city, state, country };
};

module.exports = { parseAddress };
