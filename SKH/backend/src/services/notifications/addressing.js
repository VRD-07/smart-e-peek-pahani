/**
 * Recipient normalization and date helpers shared by every outbound channel.
 *
 * Extracted out of awarenessService when SMS and voice were added: the ladder
 * needs the same address handling, and having it import the awareness module
 * would have made the two require each other in a cycle.
 */

// Numbers reach us from Twilio as 'whatsapp:+91...', and the repo stores the
// inbound `From` value verbatim on the Farmer record. Rather than migrate that
// data, outbound sends normalize at the boundary. Bare 10-digit numbers (as used
// by the demo seed) are assumed Indian.
const DEFAULT_COUNTRY_CODE = '91';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Plain E.164 form, used by SMS and voice.
 * Returns null when the value cannot be made into a dialable number, so the
 * caller records a SKIPPED attempt instead of handing Twilio junk.
 */
function toE164(phoneNumber) {
  if (!phoneNumber) return null;

  const value = phoneNumber.toString().trim().replace(/^whatsapp:/, '');
  if (value.startsWith('+')) return value;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return digits.length > 10
    ? `+${digits}`
    : `+${DEFAULT_COUNTRY_CODE}${digits}`;
}

/** 'whatsapp:+91...' form, which is what the WhatsApp API expects. */
function toWhatsAppAddress(phoneNumber) {
  if (!phoneNumber) return null;

  const value = phoneNumber.toString().trim();
  if (value.startsWith('whatsapp:')) return value;

  const e164 = toE164(value);
  return e164 ? `whatsapp:${e164}` : null;
}

/** Alias kept for readability at call sites that are dialing, not messaging. */
const toSmsAddress = toE164;
const toVoiceAddress = toE164;

/** Whole calendar days between two dates, computed in UTC so it is testable. */
function daysBetween(from, to) {
  const dayStart = (value) => {
    const d = new Date(value);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  return Math.round((dayStart(to) - dayStart(from)) / MS_PER_DAY);
}

/** Elapsed hours between two instants, as a float. */
function hoursBetween(from, to) {
  return (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_HOUR;
}

/** DD/MM/YYYY — the format used on Indian government forms, and stable across ICU versions. */
function formatDeadlineDate(value) {
  const d = new Date(value);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

module.exports = {
  DEFAULT_COUNTRY_CODE,
  MS_PER_DAY,
  MS_PER_HOUR,
  toE164,
  toWhatsAppAddress,
  toSmsAddress,
  toVoiceAddress,
  daysBetween,
  hoursBetween,
  formatDeadlineDate,
};
