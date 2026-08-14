const Submission = require('../../models/Submission');

/**
 * Creates a new submission in the database.
 * This acts as the internal service boundary for both Web and WhatsApp flows.
 *
 * @param {Object} data - The submission payload matching the schema
 * @returns {Promise<Object>} The created submission document
 */
async function createSubmission(data) {
  const submission = new Submission(data);
  await submission.save();
  return submission;
}

module.exports = {
  createSubmission
};
