import { db } from '../storage/db';
import api from './api';

let isSyncRunning = false;

export const syncPendingSubmissions = async () => {
  if (isSyncRunning) return;
  isSyncRunning = true;

  try {
    const pending = await db.submissions.where('status').equals('SYNC_PENDING').toArray();

    for (const item of pending) {
    try {
      // 1. Farmer Registration Removed
      // The farmer is already registered and authenticated via OTP/JWT.
      // The backend /api/submissions endpoint will infer the farmer from the JWT.

      // 2. Image Upload
      let imageData = null;
      if (item.data.photo) {
        try {
          // Convert Base64 to Blob
          const res = await fetch(item.data.photo);
          const blob = await res.blob();

          const formData = new FormData();
          formData.append('image', blob, 'crop-photo.jpg');

          const uploadRes = await api.post('/uploads/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (uploadRes.data?.success && uploadRes.data?.data) {
            imageData = uploadRes.data.data;
          } else {
            throw new Error('Upload failed: Invalid response');
          }
        } catch (err) {
          console.error("Photo upload failed", err);
          await db.submissions.update(item.id, {
            status: 'SYNC_PENDING',
            error: 'Photo upload failed. Please try again.'
          });
          continue; // Stop this item, try next
        }
      }

      if (!imageData) {
        await db.submissions.update(item.id, {
          status: 'SYNC_PENDING',
          error: 'Image upload required before synchronization.'
        });
        continue;
      }

      // 3. Post Submission
      const submissionRes = await api.post('/submissions', {
        clientSubmissionId: item.data.clientSubmissionId || `web_draft_${item.id}`,
        source: 'WEB',
        gatId: item.data.gatId, // Using the MongoDB ObjectId stored in step 6
        crop: { declaredCrop: item.data.crop },
        location: {
          latitude: item.data.location?.latitude,
          longitude: item.data.location?.longitude,
          source: 'WEB_GPS',
          receivedAt: new Date()
        },
        image: {
          url: imageData.url,
          mimeType: imageData.mimeType,
          size: imageData.size
        }
      });

      await db.submissions.update(item.id, {
        status: 'SYNCED',
        validationStatus: submissionRes.data.data.status,
        validationResult: submissionRes.data.data.validationResultId,
        backendId: submissionRes.data.data._id,
        syncDate: new Date().toISOString(),
        error: null
      });

    } catch (error) {
      console.error('Sync failed for item', item.id, error);

      if (error.response) {
        if (error.response.status === 401) {
          // Authentication Limitation
          await db.submissions.update(item.id, {
            status: 'SYNC_PENDING',
            error: 'Authentication expired. Please log in to sync.'
          });
          // Note: interceptor will clear auth and redirect
        } else if (error.response.status === 403) {
          // Authorization Limitation
          await db.submissions.update(item.id, {
            status: 'SYNC_FAILED',
            error: 'Submission rejected: selected land parcel is not associated with this farmer.'
          });
        } else if (error.response.status === 409) {
          // Duplicate
          await db.submissions.update(item.id, {
            status: 'SYNCED',
            error: 'Duplicate submission.'
          });
        } else {
          // Bad Request or Server Error
          await db.submissions.update(item.id, {
            status: 'SYNC_PENDING',
            error: error.response.data?.error || 'Validation failed or server error.'
          });
        }
      } else {
        // Network Error
        await db.submissions.update(item.id, {
          status: 'SYNC_PENDING',
          error: 'Network error. Will try again later.'
        });
      }
    } // End of nested try-catch
    } // End of for loop
  } finally {
    isSyncRunning = false;
  }
};
