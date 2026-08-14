const { MESSAGE_TYPES } = require('./constants');

/**
 * Parses the incoming Twilio webhook payload into a normalized object.
 * Does not contain business or conversation state logic.
 */
function parseMessage(twilioPayload) {
  if (!twilioPayload) {
    return { type: MESSAGE_TYPES.UNKNOWN, data: null };
  }

  const {
    Body,
    Latitude,
    Longitude,
    NumMedia,
    MediaUrl0,
    MediaContentType0
  } = twilioPayload;

  // 1. Check for location
  if (Latitude && Longitude) {
    return {
      type: MESSAGE_TYPES.LOCATION,
      data: {
        rawLatitude: Latitude,
        rawLongitude: Longitude
      }
    };
  }

  // 2. Check for media (Image/Voice)
  const numMediaParsed = parseInt(NumMedia, 10);
  if (!isNaN(numMediaParsed) && numMediaParsed > 0 && MediaUrl0 && MediaContentType0) {
    // If there are multiple medias, we process the first one (Index 0) per the prototype scope
    const mimeType = MediaContentType0.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return {
        type: MESSAGE_TYPES.IMAGE,
        data: {
          url: MediaUrl0,
          mimeType: MediaContentType0
        }
      };
    }

    if (mimeType.startsWith('audio/')) {
      return {
        type: MESSAGE_TYPES.VOICE,
        data: {
          url: MediaUrl0,
          mimeType: MediaContentType0
        }
      };
    }
  }

  // 3. Fallback to Text
  if (Body && typeof Body === 'string') {
    return {
      type: MESSAGE_TYPES.TEXT,
      data: {
        text: Body.trim()
      }
    };
  }

  // Unknown or unhandled message format
  return {
    type: MESSAGE_TYPES.UNKNOWN,
    data: null
  };
}

module.exports = {
  parseMessage
};
