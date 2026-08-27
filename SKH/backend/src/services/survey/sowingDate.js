/**
 * Reading a sowing date out of what a farmer typed.
 *
 * The date matters because the timestamp check in the validation engine and the
 * season a filing counts toward both hang off it, but a farmer on WhatsApp will
 * type "१२/०६/२०२६", "12 जून", or just "आज". Rejecting everything but one strict
 * format would send most farmers round the loop for no reason.
 *
 * A date that cannot be read comes back with a reason so the flow can re-prompt.
 * Nothing here guesses: an unparseable date is not silently defaulted to today,
 * because a wrong sowing date on a record the farmer is accountable for is worse
 * than one more question.
 */

// A sowing date this far in the past is almost certainly a typo — most often a
// wrong year — rather than a real entry, so it is rejected and re-asked.
const MAX_AGE_DAYS = 550;

const MONTH_ALIASES = {
  1: ['जानेवारी', 'जनवरी', 'january', 'jan'],
  2: ['फेब्रुवारी', 'फरवरी', 'february', 'feb'],
  3: ['मार्च', 'march', 'mar'],
  4: ['एप्रिल', 'अप्रैल', 'april', 'apr'],
  5: ['मे', 'मई', 'may'],
  6: ['जून', 'june', 'jun'],
  7: ['जुलै', 'जुलाई', 'july', 'jul'],
  8: ['ऑगस्ट', 'अगस्त', 'august', 'aug'],
  9: ['सप्टेंबर', 'सितंबर', 'september', 'sept', 'sep'],
  10: ['ऑक्टोबर', 'अक्टूबर', 'october', 'oct'],
  11: ['नोव्हेंबर', 'नवंबर', 'november', 'nov'],
  12: ['डिसेंबर', 'दिसंबर', 'december', 'dec'],
};

const ALIAS_TO_MONTH = {};
Object.entries(MONTH_ALIASES).forEach(([month, aliases]) => {
  aliases.forEach((alias) => {
    ALIAS_TO_MONTH[alias.toLowerCase()] = Number.parseInt(month, 10);
  });
});

const TODAY_WORDS = ['आज', 'today', 'aaj', 'aj'];
const YESTERDAY_WORDS = ['काल', 'कल', 'yesterday', 'kal'];

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toAsciiDigits(text) {
  return text.replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function build(year, month, day) {
  // Construct at midday to keep a date from sliding across a day boundary when
  // it is later rendered in a different timezone.
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  // Reject 31 February and friends: JS rolls them over silently.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * @param {string|Date} input
 * @param {Date} [now] - injected in tests so the fixtures do not expire.
 * @returns {{ok: boolean, date: Date|null, reason: string|null}}
 */
function parseSowingDate(input, now = new Date()) {
  const fail = (reason) => ({ ok: false, date: null, reason });

  let date = null;

  if (input instanceof Date) {
    date = Number.isNaN(input.getTime()) ? null : new Date(input);
  } else if (typeof input === 'string' && input.trim()) {
    const text = toAsciiDigits(input.toLowerCase().trim());

    if (TODAY_WORDS.some((word) => text === word)) {
      date = new Date(now);
    } else if (YESTERDAY_WORDS.some((word) => text === word)) {
      date = new Date(now);
      date.setDate(date.getDate() - 1);
    } else {
      // dd/mm/yyyy, dd-mm-yy, dd.mm — separator and year both flexible.
      const numeric = text.match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?$/);
      if (numeric) {
        const day = Number.parseInt(numeric[1], 10);
        const month = Number.parseInt(numeric[2], 10);
        let year = numeric[3] ? Number.parseInt(numeric[3], 10) : now.getFullYear();
        if (year < 100) year += 2000;
        date = build(year, month, day);
      } else {
        // "12 जून", "12 june 2026", "जून 12".
        const alias = Object.keys(ALIAS_TO_MONTH)
          .sort((a, b) => b.length - a.length)
          .find((candidate) => new RegExp(`(?:^|[^ऀ-ॿa-z])${candidate}(?:$|[^ऀ-ॿa-z])`, 'u').test(` ${text} `));

        if (alias) {
          const numbers = text.match(/\d{1,4}/g) || [];
          const day = numbers.find((value) => Number.parseInt(value, 10) >= 1 && Number.parseInt(value, 10) <= 31);
          const yearToken = numbers.find((value) => value.length === 4);
          if (day) {
            date = build(
              yearToken ? Number.parseInt(yearToken, 10) : now.getFullYear(),
              ALIAS_TO_MONTH[alias],
              Number.parseInt(day, 10),
            );
          }
        }
      }
    }
  }

  if (!date || Number.isNaN(date.getTime())) return fail('UNPARSEABLE');

  // A sowing date cannot be in the future — the crop is either in the ground or
  // there is nothing yet to photograph.
  if (startOfDay(date) > startOfDay(now)) return fail('IN_FUTURE');

  const ageDays = (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000);
  if (ageDays > MAX_AGE_DAYS) return fail('TOO_OLD');

  return { ok: true, date, reason: null };
}

/**
 * A date as a farmer-facing dd/mm/yyyy string. Deliberately not toLocaleDateString:
 * the server's locale has nothing to do with the farmer's, and dd/mm/yyyy is what
 * every Indian government form prints.
 */
function formatSowingDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

module.exports = {
  parseSowingDate,
  formatSowingDate,
  MAX_AGE_DAYS,
  MONTH_ALIASES,
};
