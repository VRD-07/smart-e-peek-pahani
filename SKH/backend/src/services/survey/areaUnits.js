/**
 * Reading an area a farmer typed, and printing one back.
 *
 * Area is stored in hectares because that is the unit on the 7/12 record, but
 * nobody standing in a field says "nought point four hectares" — they say एक एकर
 * or वीस गुंठे. Accepting only hectares would push a conversion onto the farmer at
 * exactly the step where getting it wrong routes their filing to review.
 *
 * A bare number is read as hectares. That is a real assumption and not a safe one
 * in every case, so the confirmation the flow sends back always states the unit,
 * giving the farmer a chance to notice.
 */

const { AREA_UNIT_TO_HECTARE } = require('./constants');

// Every spelling of every unit we accept. Marathi, Hindi, English and the
// transliterations in between, singular and plural.
const UNIT_ALIASES = {
  HECTARE: ['हेक्टर', 'हेक्टेअर', 'हे', 'हेक्टेयर', 'hectare', 'hectares', 'hect', 'ha', 'he'],
  ARE: ['आर', 'are', 'ares', 'ar'],
  ACRE: ['एकर', 'एकड़', 'acre', 'acres', 'ekar'],
  GUNTHA: ['गुंठा', 'गुंठे', 'गुंठ', 'guntha', 'gunthe', 'gunta', 'gunte'],
  SQUARE_METRE: ['चौरस मीटर', 'चौ मी', 'वर्ग मीटर', 'square metre', 'square meter', 'sq m', 'sqm', 'm2'],
};

const ALIAS_TO_UNIT = {};
Object.entries(UNIT_ALIASES).forEach(([unit, aliases]) => {
  aliases.forEach((alias) => {
    ALIAS_TO_UNIT[alias.toLowerCase()] = unit;
  });
});

// Devanagari digits, which a Marathi keyboard will happily produce.
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toAsciiDigits(text) {
  return text.replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
}

/**
 * Parse an area expression into hectares.
 *
 * @param {string|number} input - "0.6", "1 एकर", "20 gunthe", "1.5 हेक्टर".
 * @returns {{ok: boolean, hectares: number|null, unit: string|null, value: number|null, reason: string|null}}
 */
function parseArea(input) {
  const fail = (reason) => ({ ok: false, hectares: null, unit: null, value: null, reason });

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return fail('NOT_POSITIVE');
    return { ok: true, hectares: input, unit: 'HECTARE', value: input, reason: null };
  }
  if (typeof input !== 'string' || !input.trim()) return fail('EMPTY');

  const text = toAsciiDigits(input.toLowerCase().trim())
    // Farmers write "1.5", "1,5" and "1 . 5"; normalise to a single decimal point.
    .replace(/,/g, '.')
    .replace(/\s*\.\s*/g, '.');

  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return fail('NO_NUMBER');

  const value = Number.parseFloat(numberMatch[0]);
  if (!Number.isFinite(value) || value <= 0) return fail('NOT_POSITIVE');

  // Whatever is left once the number is removed should name a unit. An empty
  // remainder means a bare number, which is read as hectares.
  const remainder = text.replace(numberMatch[0], ' ').replace(/[^ऀ-ॿa-z0-9 ]/g, ' ').trim();
  if (!remainder) {
    return { ok: true, hectares: value, unit: 'HECTARE', value, reason: null };
  }

  // Longest alias first, so "चौ मी" is not shadowed by a shorter alias inside it.
  const alias = Object.keys(ALIAS_TO_UNIT)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i');
      return regex.test(remainder);
    });

  if (!alias) return fail('UNKNOWN_UNIT');

  const unit = ALIAS_TO_UNIT[alias];
  const hectares = value * AREA_UNIT_TO_HECTARE[unit];
  return { ok: true, hectares, unit, value, reason: null };
}

/**
 * Hectares as a farmer-facing string. Four decimals because one guntha is about
 * 0.0101 ha, and rounding it away would make a twenty-guntha entry unreadable.
 * Trailing zeroes are trimmed so a round 2 ha does not print as "2.0000".
 */
function formatHectares(hectares, language = 'mr') {
  if (typeof hectares !== 'number' || !Number.isFinite(hectares)) return '-';
  const trimmed = Number.parseFloat(hectares.toFixed(4)).toString();
  const unit = language === 'en' ? 'ha' : 'हेक्टर';
  return `${trimmed} ${unit}`;
}

module.exports = {
  parseArea,
  formatHectares,
  UNIT_ALIASES,
};
