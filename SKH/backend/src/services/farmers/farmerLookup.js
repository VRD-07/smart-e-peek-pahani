/**
 * Finding a farmer by phone number, in one place.
 *
 * Numbers are stored in E.164 and the schema setter normalizes query filters too,
 * so `Farmer.findOne({ phoneNumber })` is now correct from any entry point. What
 * this adds is the fallback for records written *before* normalization: a live
 * database already holds farmers registered as bare '9876543210' by the website,
 * and the WhatsApp bot must not tell one of them they are not registered.
 *
 * The fallback also repairs the row it finds, so the slow path runs at most once
 * per farmer and the data converges on the canonical format on its own.
 */

const Farmer = require('../../models/Farmer');
const { toE164, legacyPhoneFilter } = require('../../utils/phone');

/**
 * @param {string} phoneNumber - In any shape: 'whatsapp:+91...', '+91...', or bare digits.
 * @param {Object} [options]
 * @param {string|string[]} [options.populate] - Paths to populate, e.g. 'associatedGats'.
 * @returns {Promise<Object|null>} The farmer document, or null if there is no such farmer.
 */
async function findFarmerByPhone(phoneNumber, { populate = null } = {}) {
  const canonical = toE164(phoneNumber);
  if (!canonical) return null;

  const withPopulate = (query) => (populate ? query.populate(populate) : query);

  const farmer = await withPopulate(Farmer.findOne({ phoneNumber: canonical }));
  if (farmer) return farmer;

  const legacy = legacyPhoneFilter(canonical);
  if (!legacy) return null;

  const stale = await withPopulate(Farmer.findOne({ phoneNumber: legacy }));
  if (!stale) return null;

  // Heal it, but do not fail the caller's lookup if healing collides with an
  // existing canonical row — returning the farmer we found still answers the
  // question that was asked.
  try {
    await Farmer.updateOne({ _id: stale._id }, { $set: { phoneNumber: canonical } });
    stale.phoneNumber = canonical;
  } catch (error) {
    console.error('[Farmer Lookup] Could not normalize stored number:', error.message);
  }

  return stale;
}

async function findOrCreateFarmerByPhone(phoneNumber, { name = 'Farmer', preferredLanguage = 'mr', populate = null } = {}) {
  const canonical = toE164(phoneNumber);
  if (!canonical) return null;

  let farmer = await findFarmerByPhone(canonical, { populate });
  if (farmer) return farmer;

  // Auto-register new farmer with available demo Gats so they are never blocked
  const Gat = require('../../models/Gat');
  const demoGats = await Gat.find({}).limit(6);
  const gatIds = demoGats.map(g => g._id);

  farmer = await Farmer.create({
    name,
    phoneNumber: canonical,
    preferredLanguage,
    associatedGats: gatIds
  });

  if (populate) {
    await farmer.populate(populate);
  }

  return farmer;
}

module.exports = { findFarmerByPhone, findOrCreateFarmerByPhone };
