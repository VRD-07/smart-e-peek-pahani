const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Downloads and validates media securely from Twilio.
 *
 * @param {string} url - Twilio Media URL
 * @param {string} expectedMimeType - The MIME type we expect
 * @returns {Promise<Object>} Normalized media object with a temporary local path
 */
async function processMedia(url, expectedMimeType) {
  if (!url || !expectedMimeType) {
    throw new Error('Missing URL or expected MIME type');
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials for media download');
  }

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      auth: {
        username: accountSid,
        password: authToken
      },
      timeout: 10000, // 10s timeout to prevent hanging
      maxRedirects: 5
    });

    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith(expectedMimeType.split('/')[0])) {
      throw new Error(`Unexpected content type: ${contentType}. Expected prefix: ${expectedMimeType.split('/')[0]}`);
    }

    const contentLength = parseInt(response.headers['content-length'] || '0', 10);
    if (contentLength > MAX_SIZE_BYTES) {
      throw new Error('Media file too large (exceeds Content-Length)');
    }

    const tempFilePath = path.join(os.tmpdir(), `spp_media_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    const writer = fs.createWriteStream(tempFilePath);

    let downloadedBytes = 0;

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_SIZE_BYTES) {
          response.data.destroy();
          writer.close();
          // Remove partial file
          fs.unlink(tempFilePath, () => {});
          return reject(new Error('Media file exceeds max size during stream'));
        }
      });

      response.data.pipe(writer);

      writer.on('finish', () => {
        resolve({
          url: `file://${tempFilePath}`,
          mimeType: contentType,
          size: downloadedBytes
        });
      });

      writer.on('error', (err) => {
        fs.unlink(tempFilePath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    throw new Error(`Media download failed: ${error.message}`);
  }
}

module.exports = {
  processMedia,
  MAX_SIZE_BYTES
};
