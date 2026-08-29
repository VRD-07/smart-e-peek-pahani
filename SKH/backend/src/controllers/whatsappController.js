const twilio = require('twilio');
const { parseMessage } = require('../services/whatsapp/whatsappParser');
const { processFlow } = require('../services/whatsapp/whatsappFlow');
const { buildFlowContext } = require('../services/whatsapp/flowContext');

const { processLocation } = require('../services/whatsapp/locationService');
const { processMedia } = require('../services/whatsapp/mediaService');
const { MESSAGE_TYPES, STATES } = require('../services/whatsapp/constants');
const { AREA_REASON_CODES, LOCATION_REASON_CODES } = require('../services/validation/constants');
const { findFarmerByPhone } = require('../services/farmers/farmerLookup');
const { toE164 } = require('../utils/phone');
const WhatsAppSession = require('../models/WhatsAppSession');

// States where a text message is a crop name and should go through the matcher.
// The confirmation state is included because a farmer who rejects all the offered
// candidates by retyping the name is making a fresh attempt at it, not an invalid
// menu selection.
const CROP_INPUT_STATES = [STATES.WAITING_FOR_CROP, STATES.WAITING_FOR_CROP_CONFIRMATION];

/**
 * Handles incoming Twilio webhooks.
 * Coordinates parsing, state transition, and sending the response.
 */
async function handleWebhook(req, res) {
  try {
    const payload = req.body || {};

    // Twilio sends the sender in the 'From' field as 'whatsapp:+919876543210'.
    // Everything downstream — the session, the Farmer lookup, the notification log —
    // keys on the canonical E.164 number instead. Using the raw value here is what
    // made a farmer who registered on the website ("9876543210") invisible to the
    // bot, which then answered a perfectly registered number with "not registered".
    const sender = payload.From;

    if (!sender) {
      // Malformed webhook payload
      return res.status(400).send('Bad Request: Missing From field');
    }

    const phoneNumber = toE164(sender);

    if (!phoneNumber) {
      return res.status(400).send('Bad Request: Unusable From field');
    }

    // 1. Fetch current session atomically, or create it if it doesn't exist
    let currentSession = await WhatsAppSession.findOneAndUpdate(
      { phoneNumber },
      { $setOnInsert: { phoneNumber, state: STATES.START } },
      { returnDocument: 'after', upsert: true }
    );

    // 1.5 Fetch Farmer (or auto-register for WhatsApp flow)
    let farmer = await findFarmerByPhone(phoneNumber, { populate: 'associatedGats' });
    if (!farmer) {
      const { autoRegisterFarmer } = require('./authController');
      try {
        farmer = await autoRegisterFarmer(phoneNumber, { name: 'WhatsApp Farmer' });
        if (farmer && farmer._id) {
          farmer = await findFarmerByPhone(phoneNumber, { populate: 'associatedGats' });
        }
      } catch (err) {
        console.warn('[WhatsApp Controller] Auto-register farmer notice:', err.message);
      }
    }

    // 1.55 Adopt the farmer's stored language preference onto a fresh session.
    //
    // This is what replaces the language menu. A farmer who once said "English" is
    // answered in English forever after, across sessions, without being asked
    // again; a farmer we have never heard from gets Marathi, which the flow
    // defaults to. Only applied when the session has no language of its own, so a
    // mid-conversation switch is not undone on the next message.
    if (!currentSession.language && farmer?.preferredLanguage) {
      currentSession.language = farmer.preferredLanguage;
    }

    // 1.6 One-time awareness intro for a number we have never heard from.
    // Deliberately not gated on the farmer existing: the people who lose out on
    // relief are the ones with no record at all, so an unregistered number gets
    // the explanation too. NotificationLog de-duplicates for the life of the
    // number, which is why this does not live on the 24h WhatsApp session.
    // Language: the farmer's own preference when we know it, otherwise the
    // session's, otherwise Marathi — which is also the bot's default, so a first
    // message and the intro that answers it are in the same language.
    try {
      const { sendAwarenessIntro } = require('../services/notifications/awarenessService');
      const introLanguage = farmer?.preferredLanguage || currentSession.language || 'mr';
      await sendAwarenessIntro(phoneNumber, introLanguage, farmer?._id || null);
    } catch (error) {
      // Awareness is additive; never let it break the survey flow.
      console.error('[WhatsApp Controller] Awareness intro failed:', error.message);
    }

    // 2. Parse Incoming Payload
    let parsedMessage = parseMessage(payload);

    // 3. Normalize Location or Media if present
    if (parsedMessage.type === MESSAGE_TYPES.LOCATION) {
      const loc = processLocation(parsedMessage.data.rawLatitude, parsedMessage.data.rawLongitude);
      if (!loc) {
        // Invalid location data
        parsedMessage.type = MESSAGE_TYPES.UNKNOWN;
      } else {
        parsedMessage.data = loc;
      }
    } else if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
      const { isVerificationQuery, verifySchemeOrCalamity } = require('../services/verification/schemeVerificationService');
      const verifyCheck = isVerificationQuery(parsedMessage.data?.text);
      if (verifyCheck.isQuery) {
        const lang = verifyCheck.language || currentSession.language || farmer?.preferredLanguage || 'mr';
        const verifyResult = await verifySchemeOrCalamity(verifyCheck.query, lang);

        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message(verifyResult.reply);
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        return res.end(twiml.toString());
      }

      if (CROP_INPUT_STATES.includes(currentSession.state)) {
        const { extractCrop } = require('../services/voice/cropExtraction');
        parsedMessage.data.extraction = extractCrop(parsedMessage.data.text);
      }
    } else if (parsedMessage.type === MESSAGE_TYPES.IMAGE || parsedMessage.type === MESSAGE_TYPES.VOICE) {
      try {
        const media = await processMedia(parsedMessage.data.url, parsedMessage.data.mimeType);
        parsedMessage.data = media;

        if (parsedMessage.type === MESSAGE_TYPES.IMAGE) {
          const storageFactory = require('../services/storage/storageFactory');
          const storage = storageFactory.getStorageProvider();

          try {
            const uploadResult = await storage.uploadImage(media, payload.MessageSid);

            parsedMessage.data = {
              url: uploadResult.url,
              mimeType: uploadResult.mimeType,
              size: uploadResult.size
            };
          } finally {
            const fs = require('fs');
            const localPath = media.url.replace('file://', '');
            fs.unlink(localPath, (err) => {
              if (err) console.error('Failed to cleanup temp file:', err);
            });
          }
        }

        if (parsedMessage.type === MESSAGE_TYPES.VOICE) {
          const { transcribeCrop } = require('../services/voice/voiceCropService');

          try {
            // The service decides whether the transcript is worth acting on and
            // returns a reason when it is not. The type stays VOICE so the crop
            // step can answer with the right fallback instead of the generic
            // "I did not understand" a stuck farmer cannot act on.
            const voiceResult = await transcribeCrop(media);

            parsedMessage.data = {
              media,
              transcript: voiceResult.transcript,
              confidence: voiceResult.confidence,
              extraction: {
                declaredCrop: voiceResult.declaredCrop,
                reason: voiceResult.reason,
                ...(voiceResult.candidates ? { candidates: voiceResult.candidates } : {}),
              },
            };
          } finally {
            // Voice notes are transcribed and discarded — unlike the crop photo,
            // the audio is not evidence and is not kept. The image path already
            // cleaned up after itself; this one did not, so every voice note left
            // a file behind in the OS temp directory.
            const fs = require('fs');
            const localPath = media.url.replace('file://', '');
            fs.unlink(localPath, (err) => {
              if (err) console.error('Failed to cleanup temp audio file:', err);
            });
          }
        }
      } catch (err) {
        console.error('Media download or upload error:', err);
        parsedMessage.type = MESSAGE_TYPES.UNKNOWN;
      }
    }

    // 4. Process Flow
    //
    // The state machine is pure, so the reads its prompts need — the parcel's
    // registered area, the season's running total, the parcel's filing history —
    // are fetched here and handed in. See services/whatsapp/flowContext.js.
    const flowContext = await buildFlowContext(currentSession, farmer);
    let {
      nextState,
      replyText,
      updatedSessionData,
      farmerUpdates,
      sideEffect,
    } = processFlow(currentSession, parsedMessage, farmer, flowContext);

    // 4.5 A language switch is a preference, not a session detail. Persisting it on
    // the Farmer is what lets the bot stop asking: the next conversation, months
    // later on a new session, still opens in the language they chose.
    if (farmerUpdates && farmer) {
      try {
        Object.assign(farmer, farmerUpdates);
        await farmer.save();
      } catch (error) {
        console.error('[WhatsApp Controller] Could not persist farmer preference:', error.message);
      }
    }

    // 5. Save Session in MongoDB
    const previousState = currentSession.state;
    Object.assign(currentSession, updatedSessionData);
    currentSession.state = nextState;
    await currentSession.save();

    // 5.5 Records the flow asked for that are not submissions.
    //
    // Only the boundary planting, which is informational and deliberately does not
    // go through the validation gate — see models/FieldPlanting.js. A failure here
    // is reported to the farmer rather than swallowed: they were told it was saved.
    if (sideEffect && sideEffect.type === 'CREATE_PLANTING') {
      const { getMessage } = require('../services/whatsapp/messages');
      const language = currentSession.language || 'mr';

      if (!farmer) {
        replyText = getMessage('UNREGISTERED_FARMER', language);
      } else {
        try {
          const FieldPlanting = require('../models/FieldPlanting');
          await FieldPlanting.create({
            farmerId: farmer._id,
            gatId: sideEffect.data.gatId,
            plantingType: sideEffect.data.plantingType,
            approximateLocation: {
              text: sideEffect.data.locationText,
              latitude: sideEffect.data.location ? sideEffect.data.location.latitude : undefined,
              longitude: sideEffect.data.location ? sideEffect.data.location.longitude : undefined,
            },
            source: 'WHATSAPP',
            language,
          });
        } catch (error) {
          console.error('[WhatsApp Controller] Error creating field planting:', error);
          replyText = getMessage('ERROR', language);
        }
      }
    }

    // 6. Generate Submission and Web Bridge if transitioning to READY_FOR_VALIDATION
    if (nextState === STATES.READY_FOR_VALIDATION && previousState !== STATES.READY_FOR_VALIDATION) {
      const { getMessage } = require('../services/whatsapp/messages');
      const language = currentSession.language || 'mr';

      if (!farmer) {
        replyText = getMessage('UNREGISTERED_FARMER', language);
      } else if (!currentSession.selectedGatId) {
        replyText = getMessage('MISSING_GAT', language);
      } else {
        const { createSubmission } = require('../services/submission/submissionService');
        const submissionData = {
          clientSubmissionId: `wa_${payload.MessageSid}`,
          farmerId: farmer._id,
          source: 'WHATSAPP',
          gatId: currentSession.selectedGatId,
          // The survey answers collected before the photo step. Left undefined
          // rather than defaulted when a field was never asked — the area check
          // reports SKIPPED on a missing figure, and a default would turn that
          // into a check that appears to have run.
          season: currentSession.season || undefined,
          cropYear: typeof currentSession.cropYear === 'number' ? currentSession.cropYear : undefined,
          peekType: currentSession.peekType || undefined,
          registeredArea: typeof currentSession.registeredArea === 'number'
            ? currentSession.registeredArea
            : undefined,
          waterSource: currentSession.waterSource || undefined,
          waterSourceOther: currentSession.waterSourceOther || undefined,
          sowingDate: currentSession.sowingDate || undefined,
          crop: {
            declaredCrop: currentSession.declaredCrop,
            language: language,
            cropCategory: currentSession.cropCategory || undefined,
            matchConfidence: typeof currentSession.matchConfidence === 'number'
              ? currentSession.matchConfidence
              : undefined,
            matchMethod: currentSession.matchMethod || undefined,
            declaredText: currentSession.declaredCropText || undefined,
          },
          location: {
            latitude: currentSession.location.latitude,
            longitude: currentSession.location.longitude,
            source: 'WHATSAPP'
          },
          image: {
            url: currentSession.image.url,
            mimeType: currentSession.image.mimeType,
            size: currentSession.image.size
          },
          status: 'PENDING_VALIDATION'
        };

        try {
          const createdSubmission = await createSubmission(submissionData);
          const { createBridgeToken } = require('../services/whatsapp/webBridgeService');
          const bridge = await createBridgeToken(phoneNumber, createdSubmission._id);
          replyText += `\n\nSubmit your data securely here: ${bridge.url}`;

          // Step 3 - Connect Submission to Validation internally
          const { validateSubmission } = require('../services/validation/validationService');
          const validated = await validateSubmission(createdSubmission._id);

          // The area overallocation outcome gets its own message. "Sent for
          // review" on its own leaves a farmer with nothing to act on, and this is
          // the one review reason they can actually check — the figures are on
          // their own 7/12 record.
          const areaCheck = validated?.validationResultId?.checks?.area;
          if (areaCheck && areaCheck.reasonCode === AREA_REASON_CODES.AREA_OVERALLOCATION) {
            const { formatHectares } = require('../services/survey/areaUnits');
            replyText += `\n\n${getMessage('AREA_OVERALLOCATION_NOTICE', language, {
              registered: formatHectares(areaCheck.registeredArea, language),
              claimed: formatHectares(areaCheck.claimedTotal, language),
            })}`;
          }

          // Same reasoning for a filing made outside the parcel: the distance is
          // the difference between "walk back into your field" and "you have
          // selected the wrong Gat", and only the farmer can tell which it is.
          // Deliberately not extended to the near-boundary REVIEW case — a filing
          // a few metres inside its own edge is not a farmer who went to the wrong
          // place, and telling them a distance would suggest they had.
          const locationCheck = validated?.validationResultId?.checks?.location;
          if (locationCheck
            && locationCheck.reasonCode === LOCATION_REASON_CODES.OUTSIDE_BOUNDARY
            && typeof locationCheck.distanceFromBoundary === 'number') {
            const { formatDistance } = require('../utils/distance');
            replyText += `\n\n${getMessage('OUT_OF_BOUNDS_DISTANCE_NOTICE', language, {
              distance: formatDistance(locationCheck.distanceFromBoundary, language),
            })}`;
          }
        } catch (error) {
          if (error.code === 11000) {
            replyText = getMessage('ERROR', language); // or duplicate error msg if it existed
          } else {
            console.error('[WhatsApp Controller] Error creating submission:', error);
            replyText = getMessage('ERROR', language);
          }
        }
      }
    }

    // 5. Send Response via TwiML
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(replyText);

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  } catch (error) {
    console.error('[WhatsApp Controller] Error processing webhook:', error);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  handleWebhook
};
