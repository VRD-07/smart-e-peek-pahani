const fs = require('fs');
const axios = require('axios');
const VisionProvider = require('./visionProvider');
const { normalizeCrop, validateConfidence } = require('./aiUtils');
const { CANONICAL_CROPS } = require('../crops/cropCatalogue');
const { GoogleGenAI } = require('@google/genai');

// The list the model is allowed to answer with, built from the shared catalogue
// rather than written out here. When vision and declaration lists are maintained
// separately they drift, and the symptom is a crop mismatch nobody can explain:
// the farmer declared a crop the catalogue knows and the model answered with a
// name outside it, so normalizeCrop returned null and the check fell to REVIEW.
const ALLOWED_CROPS = CANONICAL_CROPS.map((crop) => `"${crop}"`).join(', ');

/**
 * Vision Provider implementation using Google's Gemini API.
 */
class GeminiVisionProvider extends VisionProvider {
  constructor() {
    super();
    // In test environments, API key might be empty.
    const apiKey = process.env.GEMINI_API_KEY || 'test-key';
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  /**
   * Reads the image into the format required by the Gemini SDK.
   * Handles local temporary files, buffers, or remote HTTP URLs.
   */
  async _getImageData(imageObject) {
    let base64Data;
    const mimeType = imageObject.mimeType || 'image/jpeg';

    if (imageObject.buffer && Buffer.isBuffer(imageObject.buffer)) {
      base64Data = imageObject.buffer.toString('base64');
    } else if (imageObject.url && imageObject.url.startsWith('file://')) {
      const filePath = imageObject.url.replace('file://', '');
      const data = await fs.promises.readFile(filePath);
      base64Data = data.toString('base64');
    } else if (imageObject.url && imageObject.url.startsWith('http')) {
      const response = await axios.get(imageObject.url, { responseType: 'arraybuffer' });
      base64Data = Buffer.from(response.data).toString('base64');
    } else {
      throw new Error('Unsupported image format or missing data');
    }

    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
  }

  async classify(imageObject) {
    if (!imageObject) {
      return { error: 'INVALID_INPUT', message: 'Missing image object' };
    }

    try {
      const imagePart = await this._getImageData(imageObject);

      const prompt = `Identify the agricultural crop in this image.
Return only structured JSON with:
detectedCrop: exactly one of ${ALLOWED_CROPS}, or null
confidence: number between 0 and 1

Answer null rather than guessing when the crop is not one of those listed, or the
image does not clearly show a crop.
Do not invent crop names.
Do not return explanations.`;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [prompt, imagePart],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              detectedCrop: {
                type: "STRING",
                nullable: true,
                description: `Must be one of ${ALLOWED_CROPS}, or null`
              },
              confidence: {
                type: "NUMBER"
              }
            }
          }
        }
      });

      const responseText = response.text;

      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        return { error: 'MALFORMED_RESPONSE', message: 'AI returned invalid JSON' };
      }

      if (!parsed) {
        return { error: 'EMPTY_RESPONSE', message: 'AI returned empty response' };
      }

      if (!validateConfidence(parsed.confidence)) {
        return { error: 'INVALID_CONFIDENCE', message: 'AI returned an invalid confidence score' };
      }

      const normalizedCrop = normalizeCrop(parsed.detectedCrop);

      return {
        detectedCrop: normalizedCrop,
        confidence: parsed.confidence
      };

    } catch (error) {
      // Specifically handle timeout or API errors without crashing
      return {
        error: 'PROVIDER_ERROR',
        message: `Gemini API failed: ${error.message}`
      };
    }
  }
}

module.exports = GeminiVisionProvider;
