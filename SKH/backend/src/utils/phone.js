/**
 * One canonical phone number format for the whole system: E.164, e.g. +919876543210.
 *
 * Numbers arrive in three shapes and used to be stored in whichever shape they
 * arrived in — Twilio webhooks send 'whatsapp:+919876543210', the website login
 * form sends a bare '9876543210', and the seed scripts wrote bare digits too. A
 * farmer registered through one door was therefore invisible through another, which
 * is exactly the "your number is not registered" bug on the WhatsApp bot.
 *
 * The fix is one format on write, applied by the models themselves rather than
 * remembered at each entry point — see `phoneField` below. Channel-specific
 * addressing ('whatsapp:' prefixes and the like) stays where it belongs, on the
 * outbound boundary in services/notifications/addressing.js, which normalizes
 * through this module.
 */

// Bare 10-digit numbers are assumed Indian: the users are farmers in Maharashtra
// and the login form asks for a 10-digit mobile.
const DEFAULT_COUNTRY_CODE = '91';

/**
 * The canonical form of a number, or null when there is nothing dialable in it.
 *
 * Null rather than a guess, so a caller records a skipped attempt instead of
 * handing a provider junk. Values that already start with '+' are trusted as-is,
 * which is what lets tests use deliberately-unreachable numbers like '+91fail0001'.
 */
function toE164(phoneNumber) {
  if (phoneNumber === null || phoneNumber === undefined) return null;

  const value = phoneNumber.toString().trim().replace(/^whatsapp:/i, '');
  if (value.startsWith('+')) return value;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return digits.length > 10
    ? `+${digits}`
    : `+${DEFAULT_COUNTRY_CODE}${digits}`;
}

/**
 * A filter matching a number stored in any older shape.
 *
 * Anchored on the last 10 digits, which is the part that identifies the handset:
 * '9876543210', '+919876543210' and 'whatsapp:+919876543210' all end the same way.
 * A regex rather than an `$in` of variants because Mongoose applies the field's
 * setter to `$in` elements too, collapsing every variant to the canonical form and
 * finding nothing — the very rows this is meant to reach.
 */
function legacyPhoneFilter(phoneNumber) {
  const e164 = toE164(phoneNumber);
  if (!e164) return null;

  const last10 = e164.replace(/\D/g, '').slice(-10);
  if (last10.length < 10) return null;

  return { $regex: `${last10}$` };
}

/** Do two numbers refer to the same handset, whatever shape they arrived in? */
function isSamePhone(a, b) {
  const left = toE164(a);
  const right = toE164(b);
  return !!left && left === right;
}

/**
 * Rewrite any documents still holding a number in a pre-normalization shape.
 *
 * Idempotent, and cheap at this scale (one village). Called from the demo seed so
 * a database that predates normalization is repaired before the demo runs, rather
 * than leaving a farmer who registered by SMS invisible to the bot.
 *
 * A collision means the same handset exists twice, once per format. The canonical
 * row wins and the legacy duplicate is reported rather than deleted — merging
 * someone's submissions is not a decision a seed script should make silently.
 */
async function normalizeStoredPhoneNumbers(Model) {
  const docs = await Model.find({}).select('phoneNumber').lean();
  const result = { scanned: docs.length, normalized: 0, conflicts: [] };

  for (const doc of docs) {
    const canonical = toE164(doc.phoneNumber);
    if (!canonical || canonical === doc.phoneNumber) continue;

    try {
      await Model.updateOne({ _id: doc._id }, { $set: { phoneNumber: canonical } });
      result.normalized += 1;
    } catch (error) {
      // Duplicate key: a canonical row for this handset already exists.
      if (error.code === 11000) {
        result.conflicts.push({ id: doc._id, phoneNumber: doc.phoneNumber, canonical });
      } else {
        throw error;
      }
    }
  }

  return result;
}

/**
 * Schema definition for a phone number field.
 *
 * A setter rather than a pre-save hook because Mongoose applies setters to query
 * filters and `$set` payloads as well as to documents. One declaration therefore
 * normalizes writes *and* reads: `findOne({ phoneNumber: '9876543210' })` matches a
 * record stored as '+919876543210' without every call site remembering to convert.
 */
function phoneField(extra = {}) {
  return {
    type: String,
    set: (value) => toE164(value) ?? value,
    ...extra,
  };
}

module.exports = {
  DEFAULT_COUNTRY_CODE,
  toE164,
  legacyPhoneFilter,
  isSamePhone,
  phoneField,
  normalizeStoredPhoneNumbers,
};
