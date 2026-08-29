const { successResponse, errorResponse } = require('../utils/response');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const ValidationResult = require('../models/ValidationResult');
const Farmer = require('../models/Farmer');
const Gat = require('../models/Gat');
const CalamityMatch = require('../models/CalamityMatch');
const { validateSubmission } = require('../services/validation/validationService');
const { getMatchesForSubmissions } = require('../services/relief/calamityMatchingService');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'status'];

const createSubmission = async (req, res) => {
  try {
    const {
      clientSubmissionId,
      source,
      gatId,
      crop,
      location,
      image,
      season,
      cropYear: userCropYear,
      peekType,
      registeredArea,
      waterSource,
      waterSourceOther,
      sowingDate,
    } = req.body;

    // 2. AUTHENTICATED FARMER ID (ignore req.body.farmerId)
    const farmerId = req.user?.farmerId;

    if (!farmerId) {
      return errorResponse(res, 'Not authorized, no token', 'UNAUTHORIZED', 401);
    }

    if (!gatId) {
      return errorResponse(res, 'Missing gatId', 'VALIDATION_ERROR', 400);
    }

    // 3. FARMER LOOKUP
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
    }

    // 4. GAT AUTHORIZATION
    if (!farmer.associatedGats || farmer.associatedGats.length === 0) {
      return errorResponse(res, 'Farmer Gat not configured', 'FARMER_GAT_NOT_CONFIGURED', 400);
    }

    const hasGat = farmer.associatedGats.some(gId => gId.toString() === gatId);
    if (!hasGat) {
      return errorResponse(res, 'Requested Gat does not match Farmer Gat', 'FARMER_GAT_MISMATCH', 403);
    }

    const { cropYear: calcCropYear } = require('../services/survey/constants');
    const calculatedCropYear = userCropYear || calcCropYear(sowingDate ? new Date(sowingDate) : new Date());

    // 5. SUBMISSION CREATION
    const submission = await Submission.create({
      clientSubmissionId,
      farmerId,
      source,
      gatId,
      crop,
      location,
      image,
      season,
      cropYear: calculatedCropYear,
      peekType,
      registeredArea,
      waterSource,
      waterSourceOther,
      sowingDate: sowingDate ? new Date(sowingDate) : undefined,
      status: 'PENDING_VALIDATION',
    });

    // Run Validation Engine synchronously for WEB client
    const validatedSubmission = await validateSubmission(submission._id);

    return successResponse(res, 'Submission created', validatedSubmission, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Submission already exists', 'DUPLICATE_SUBMISSION', 409);
    }
    throw error;
  }
};

const getSubmission = async (req, res) => {
  const { id } = req.params;
  const submission = await Submission.findById(id).populate('validationResultId');
  if (!submission) {
    return errorResponse(res, 'Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }
  return successResponse(res, 'Submission fetched successfully', submission);
};

/**
 * Global submission listing for the Officer Dashboard.
 *
 * Officer-only: returns submissions across every farmer and Gat, unlike the
 * farmer-facing routes which are scoped to the authenticated farmer.
 * Supports pagination, status / Gat / administrative-area / date-range filters,
 * a calamity-relief-eligibility filter and whitelisted sorting.
 */
const listSubmissions = async (req, res) => {
  const { status, gatId, district, village, from, to, sortBy, sortOrder, reliefEligible } = req.query;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);

  const query = {};

  // Status filter: accepts a single status or a comma-separated list.
  if (status) {
    const allowedStatuses = Submission.schema.path('status').enumValues;
    const requested = status.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const invalid = requested.filter(s => !allowedStatuses.includes(s));

    if (requested.length === 0 || invalid.length > 0) {
      return errorResponse(res, `Unsupported status filter: ${invalid.join(', ')}`, 'VALIDATION_ERROR', 400);
    }
    query.status = { $in: requested };
  }

  // Gat and administrative-area filters both resolve to a set of Gat ids.
  // Gat carries village + district (there is no taluka field on the model yet),
  // so area filtering looks up matching Gats first and then narrows submissions.
  const gatIdSets = [];

  if (gatId) {
    if (!mongoose.Types.ObjectId.isValid(gatId)) {
      return errorResponse(res, 'Invalid gatId', 'VALIDATION_ERROR', 400);
    }
    gatIdSets.push([gatId.toString()]);
  }

  if (district || village) {
    const gatQuery = {};
    if (district) gatQuery.district = district;
    if (village) gatQuery.village = village;

    const matchingGats = await Gat.find(gatQuery).select('_id');
    gatIdSets.push(matchingGats.map(g => g._id.toString()));
  }

  if (gatIdSets.length > 0) {
    const intersection = gatIdSets.reduce((acc, ids) => acc.filter(id => ids.includes(id)));
    // Cast explicitly: the aggregation below shares this query object and
    // $match does not apply Mongoose schema casting the way find() does.
    query.gatId = { $in: intersection.map(id => new mongoose.Types.ObjectId(id)) };
  }

  // Date range filter on submission creation.
  if (from || to) {
    query.createdAt = {};

    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return errorResponse(res, 'Invalid from date', 'VALIDATION_ERROR', 400);
      }
      query.createdAt.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return errorResponse(res, 'Invalid to date', 'VALIDATION_ERROR', 400);
      }
      query.createdAt.$lte = toDate;
    }
  }

  const sortField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  // Relief-eligibility filter. Resolves through CalamityMatch using the same
  // pre-query-then-narrow shape as the district/village filters above.
  // Captured before the filter is applied so the relief count below can ignore
  // it, the way statusCounts ignores the status filter.
  const reliefQuery = { ...query };
  const matchedIds = await CalamityMatch.distinct('submissionId');

  if (reliefEligible !== undefined) {
    if (reliefEligible !== 'true' && reliefEligible !== 'false') {
      return errorResponse(res, 'reliefEligible must be true or false', 'VALIDATION_ERROR', 400);
    }
    query._id = reliefEligible === 'true' ? { $in: matchedIds } : { $nin: matchedIds };
  }

  // Status counts ignore the status filter itself so the dashboard tabs can show
  // totals for the rest of the active filters.
  const countsQuery = { ...query };
  delete countsQuery.status;

  const [submissions, total, statusGroups, reliefEligibleCount] = await Promise.all([
    Submission.find(query)
      .populate('farmerId', 'name phoneNumber preferredLanguage')
      .populate('gatId', 'gatNumber village district center boundary')
      .populate('validationResultId', 'overallStatus reasons checks')
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v'),
    Submission.countDocuments(query),
    Submission.aggregate([
      { $match: countsQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Submission.countDocuments({ ...reliefQuery, _id: { $in: matchedIds } }),
  ]);

  const statusCounts = statusGroups.reduce((acc, group) => {
    acc[group._id] = group.count;
    return acc;
  }, {});

  // Attach relief matches so the dashboard can badge rows without one request
  // per row. A match means the filing is eligible to be *assessed* for relief —
  // the payout decision stays with the revenue officer.
  const matchesBySubmission = await getMatchesForSubmissions(submissions.map((s) => s._id));
  const enriched = submissions.map((submission) => ({
    ...submission.toObject(),
    calamityMatches: matchesBySubmission[submission._id.toString()] || [],
  }));

  return successResponse(res, 'Submissions fetched successfully', {
    submissions: enriched,
    statusCounts,
    reliefEligibleCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
};

/**
 * Officer override of a validation outcome.
 *
 * PATCH /api/submissions/:id/status  { status: 'VALID' | 'INVALID' }
 *
 * The validation gate is deterministic and therefore sometimes wrong about a real
 * field: a GPS fix that drifted outside a boundary, a photo the vision model read
 * as the wrong crop. This is the human word on it, and it is the only way a filing
 * leaves REVIEW.
 *
 * 'REJECTED' is accepted as a synonym for INVALID. The dashboard has always shown
 * INVALID as "Rejected" to officers, so the word they use is the word the API takes.
 */
const OVERRIDE_STATUSES = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  REJECTED: 'INVALID',
};

const updateSubmissionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return errorResponse(res, 'Invalid submission id', 'VALIDATION_ERROR', 400);
  }

  if (!status) {
    return errorResponse(res, 'Status is required', 'VALIDATION_ERROR', 400);
  }

  const resolved = OVERRIDE_STATUSES[status.toString().trim().toUpperCase()];

  if (!resolved) {
    return errorResponse(
      res,
      `Unsupported override status: ${status}. Expected one of ${Object.keys(OVERRIDE_STATUSES).join(', ')}`,
      'VALIDATION_ERROR',
      400,
    );
  }

  const submission = await Submission.findByIdAndUpdate(
    id,
    {
      $set: {
        status: resolved,
        reviewedBy: req.user?.officerId || null,
        reviewedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )
    .populate('farmerId', 'name phoneNumber preferredLanguage')
    .populate('gatId', 'gatNumber village district center boundary')
    .populate('validationResultId', 'overallStatus reasons checks');

  if (!submission) {
    return errorResponse(res, 'Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }

  return successResponse(res, `Submission marked ${resolved}`, submission);
};

module.exports = {
  createSubmission,
  getSubmission,
  listSubmissions,
  updateSubmissionStatus,
};
