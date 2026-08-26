const twilio = require('twilio');
const { parseMessage } = require('../services/whatsapp/whatsappParser');
const { processFlow } = require('../services/whatsapp/whatsappFlow');

const { processLocation } = require('../services/whatsapp/locationService');
const { processMedia } = require('../services/whatsapp/mediaService');
const { MESSAGE_TYPES, STATES } = require('../services/whatsapp/constants');
const WhatsAppSession = require('../models/WhatsAppSession');

/**
 * Handles incoming Twilio webhooks.
 * Coordinates parsing, state transition, and sending the response.
 */
async function handleWebhook(req, res) {
  try {
    const payload = req.body || {};

    // Twilio sends sender number in the 'From' field (e.g. 'whatsapp:+1234567890')
    const sender = payload.From;

    if (!sender) {
      // Malformed webhook payload
      return res.status(400).send('Bad Request: Missing From field');
    }

    // 1. Fetch current session atomically, or create it if it doesn't exist
    let currentSession = await WhatsAppSession.findOneAndUpdate(
      { phoneNumber: sender },
      { $setOnInsert: { phoneNumber: sender, state: STATES.START } },
      { new: true, upsert: true }
    );

    // 1.5 Fetch Farmer
    const Farmer = require('../models/Farmer');
    const farmer = await Farmer.findOne({ phoneNumber: sender }).populate('associatedGats');

    // 1.6 One-time awareness intro for a number we have never heard from.
    // Deliberately not gated on the farmer existing: the people who lose out on
    // relief are the ones with no record at all, so an unregistered number gets
    // the explanation too. NotificationLog de-duplicates for the life of the
    // number, which is why this does not live on the 24h WhatsApp session.
    // Language: the farmer's own preference when we know it, otherwise the
    // session's, otherwise Marathi — on a genuine first message the language
    // menu has not been answered yet.
    try {
      const { sendAwarenessIntro } = require('../services/notifications/awarenessService');
      const introLanguage = farmer?.preferredLanguage || currentSession.language || 'mr';
      await sendAwarenessIntro(sender, introLanguage, farmer?._id || null);
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
    } else if (parsedMessage.type === MESSAGE_TYPES.TEXT && currentSession.state === STATES.WAITING_FOR_CROP) {
      const { extractCrop } = require('../services/voice/cropExtraction');
      parsedMessage.data.extraction = extractCrop(parsedMessage.data.text);
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
    let { nextState, replyText, updatedSessionData } = processFlow(currentSession, parsedMessage, farmer);

    // 5. Save Session in MongoDB
    const previousState = currentSession.state;
    Object.assign(currentSession, updatedSessionData);
    currentSession.state = nextState;
    await currentSession.save();

    // 6. Generate Submission and Web Bridge if transitioning to READY_FOR_VALIDATION
    if (nextState === STATES.READY_FOR_VALIDATION && previousState !== STATES.READY_FOR_VALIDATION) {
      const { getMessage } = require('../services/whatsapp/messages');
      const language = currentSession.language || 'en';

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
          crop: {
            declaredCrop: currentSession.declaredCrop,
            language: language
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
          const bridge = await createBridgeToken(sender, createdSubmission._id);
          replyText += `\n\nSubmit your data securely here: ${bridge.url}`;

          // Step 3 - Connect Submission to Validation internally
          const { validateSubmission } = require('../services/validation/validationService');
          await validateSubmission(createdSubmission._id);
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
