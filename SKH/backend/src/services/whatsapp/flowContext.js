/**
 * The database reads the WhatsApp state machine needs but is not allowed to do.
 *
 * services/whatsapp/whatsappFlow.js is pure — it takes a session and a message
 * and returns the next state. Three of the Phase 7 steps need facts that only the
 * database has: the parcel's registered area, how much of it this season's other
 * entries already claim, and the parcel's filing history. Rather than reaching
 * into Mongoose from inside the state machine, the controller calls this first and
 * hands the result in as `context`.
 *
 * Every read here is conditional on the state actually being able to use it. A
 * farmer answering the water-source question does not need their filing history
 * fetched, and doing it anyway would put two extra queries on every message.
 */

const Gat = require('../../models/Gat');
const Submission = require('../../models/Submission');
const { STATES } = require('./constants');
const { sumOtherActiveArea } = require('../validation/areaAllocation');
const { ACTIVE_ALLOCATION_STATUSES } = require('../validation/constants');

// How many past filings the history message shows. Ten because a WhatsApp
// message that scrolls for a screen and a half stops being read, and the newest
// filings are the ones a farmer is chasing.
const HISTORY_LIMIT = 10;

// States where the next reply could be the area prompt, which is the only prompt
// that needs the season's running total.
const AREA_AWARE_STATES = [
  STATES.WAITING_FOR_PEEK_TYPE,
  STATES.WAITING_FOR_AREA,
];

const { getFeaturedVillages } = require('../../data/maharashtraData');

/**
 * Resolve the selected Gat without a query where possible.
 *
 * The farmer's associatedGats are already populated by the caller, so the
 * selected parcel is almost always in memory. The findById is the fallback for a
 * session whose parcel was since unlinked from the farmer.
 */
async function resolveGat(session, farmer) {
  if (!session.selectedGatId) return null;

  const id = String(session.selectedGatId);
  const populated = (farmer?.associatedGats || []).find((gat) => String(gat._id) === id);
  if (populated) return populated;

  return Gat.findById(session.selectedGatId);
}

/**
 * @param {Object} session - the WhatsAppSession as stored
 * @param {Object|null} farmer - Farmer with associatedGats populated
 * @returns {Promise<Object>} the `context` argument for processFlow
 */
async function buildFlowContext(session, farmer = null) {
  const state = session?.state || STATES.START;
  const allGats = (farmer?.associatedGats || []).filter(Boolean);

  // Once a village has been picked, the farm picker shows that village's parcels.
  // We first check the farmer's associated Gats, and if none match, we fetch
  // Gats from the Gat collection for that village.
  let gats = allGats;
  if (session?.selectedVillage) {
    const selected = session.selectedVillage.toLowerCase();
    const inFarmerGats = allGats.filter((gat) => gat.village && gat.village.toLowerCase() === selected);
    if (inFarmerGats.length > 0) {
      gats = inFarmerGats;
    } else {
      const dbGats = await Gat.find({ village: new RegExp(`^${session.selectedVillage}$`, 'i') });
      gats = dbGats.length > 0 ? dbGats : allGats;
    }
  }

  const featuredVillages = getFeaturedVillages();

  const context = {
    gats,
    villages: featuredVillages,
    gat: null,
    otherActiveArea: 0,
    remainingArea: null,
    submissions: [],
  };

  context.gat = await resolveGat(session || {}, farmer);

  if (context.gat && AREA_AWARE_STATES.includes(state)) {
    context.otherActiveArea = await sumOtherActiveArea({
      gatId: context.gat._id,
      season: session.season,
      cropYear: session.cropYear,
    });

    if (typeof context.gat.registeredArea === 'number') {
      context.remainingArea = Math.max(context.gat.registeredArea - context.otherActiveArea, 0);
    }
  }

  // Only the action hub can ask for history, and only for the selected parcel.
  if (context.gat && state === STATES.WAITING_FOR_ACTION) {
    context.submissions = await Submission.find({
      gatId: context.gat._id,
      status: { $in: [...ACTIVE_ALLOCATION_STATUSES, 'INVALID', 'DRAFT'] },
    })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select('status registeredArea sowingDate season cropYear crop createdAt')
      .lean();
  }

  return context;
}

module.exports = {
  buildFlowContext,
  HISTORY_LIMIT,
  AREA_AWARE_STATES,
};
