const fs = require('fs');
const axios = require('axios');
const SpeechToTextProvider = require('./speechToTextProvider');
const { validateConfidence } = require('../ai/aiUtils');
const { GoogleGenAI } = require('@google/genai');

/**
 * Speech-to-Text implementation using Google's Gemini API.
 *
 * Why Gemini and not Whisper: running Whisper locally needs either a native
 * whisper.cpp build or a Python runtime with the model weights on disk, neither
 * of which we can assume on a judge's machine or a free-tier host. Gemini's
 * multimodal models take audio directly, and the SDK plus API key are already in
 * this project for crop image classification — so the real transcription path
 * adds no new dependency and no new credential.
 *
 * Mirrors geminiVisionProvider deliberately: same media loading, same structured
 * JSON contract, same "return an error object, never throw" discipline, so a
 * transcription failure degrades to asking the farmer to type rather than a 500.
 */
class GeminiSpeechToTextProvider extends SpeechToTextProvider {
  constructor() {
    super();
    // In test environments, API key might be empty.
    const apiKey = process.env.GEMINI_API_KEY || 'test-key';
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  /**
   * Reads the audio into the format required by the Gemini SDK.
   * Handles local temporary files, buffers, or remote HTTP URLs.
   */
  async _getAudioData(mediaObject) {
    let base64Data;
    // WhatsApp voice notes arrive as OGG/Opus; keep whatever the parser saw.
    const mimeType = mediaObject.mimeType || 'audio/ogg';

    if (mediaObject.buffer && Buffer.isBuffer(mediaObject.buffer)) {
      base64Data = mediaObject.buffer.toString('base64');
    } else if (mediaObject.url && mediaObject.url.startsWith('file://')) {
      const filePath = mediaObject.url.replace('file://', '');
      const data = await fs.promises.readFile(filePath);
      base64Data = data.toString('base64');
    } else if (mediaObject.url && mediaObject.url.startsWith('http')) {
      const response = await axios.get(mediaObject.url, { responseType: 'arraybuffer' });
      base64Data = Buffer.from(response.data).toString('base64');
    } else {
      throw new Error('Unsupported audio format or missing data');
    }

    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };
  }

  async transcribe(mediaObject) {
    if (!mediaObject) {
      return { error: 'INVALID_INPUT', message: 'Missing media object' };
    }

    try {
      const audioPart = await this._getAudioData(mediaObject);

      // Transcription only. The model is not asked which crop it thinks was
      // meant — that mapping is a keyword lookup against our own crop list, so
      // the model can never introduce a crop the rest of the system does not
      // recognise.
      const prompt = `Transcribe this short audio recording of a farmer naming the crop in their field.
The speaker is most likely speaking Marathi, Hindi, or English.

Return only structured JSON with:
transcript: the spoken words, in the script of the language spoken
confidence: number between 0 and 1, how clearly you could make out the words
language: "mr", "hi", "en", or null

Transcribe only what you hear.
Do not translate.
Do not guess at words you cannot make out — lower the confidence instead.
Do not return explanations.`;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [prompt, audioPart],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              transcript: {
                type: 'STRING',
                nullable: true,
                description: 'The spoken words, verbatim',
              },
              confidence: {
                type: 'NUMBER',
              },
              language: {
                type: 'STRING',
                nullable: true,
                description: "Must be 'mr', 'hi', 'en', or null",
              },
            },
          },
        },
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

      return {
        text: typeof parsed.transcript === 'string' ? parsed.transcript : '',
        confidence: parsed.confidence,
        language: parsed.language || null,
      };
    } catch (error) {
      // Timeouts, quota, unsupported codec — surfaced as data, not an exception.
      return {
        error: 'PROVIDER_ERROR',
        message: `Gemini transcription failed: ${error.message}`,
      };
    }
  }
}

module.exports = GeminiSpeechToTextProvider;
