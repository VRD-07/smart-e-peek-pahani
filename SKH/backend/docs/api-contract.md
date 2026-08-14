# Smart E-Peek Pahani - API Contract

## General Information
- **Base URL:** `/api`
- **Response Format:**
  - Success: `{ "success": true, "message": "...", "data": {} }`
  - Error: `{ "success": false, "message": "...", "code": "..." }`

---

## Health
### `GET /api/health`
Check if the backend is running.
- **Response:**
```json
{
  "success": true,
  "message": "Smart E-Peek backend is running"
}
```

---

## Farmers
### `POST /api/farmers`
Create or update a farmer by phone number.
- **Request Body:**
```json
{
  "name": "Demo Farmer",
  "phoneNumber": "+91XXXXXXXXXX",
  "preferredLanguage": "mr",
  "selectedGatId": "GAT_ID"
}
```

### `GET /api/farmers/:id`
Get a farmer by ID.

---

## Gats
### `GET /api/gats`
Get all Gats.

### `GET /api/gats/:id`
Get a Gat by ID.

---

## Submissions
### `POST /api/submissions`
Create a new submission.
- **Request Body:**
```json
{
  "clientSubmissionId": "SPP-USER001-ABC123",
  "farmerId": "FARMER_ID",
  "source": "WEB",
  "gatId": "GAT_ID",
  "crop": {
    "declaredCrop": "soybean",
    "language": "en"
  },
  "location": {
    "latitude": 19.123456,
    "longitude": 74.123456,
    "source": "WEB_GPS",
    "receivedAt": "2026-08-10T15:30:00.000Z"
  },
  "image": {
    "url": "...",
    "mimeType": "image/jpeg",
    "size": 245678
  }
}
```

### `GET /api/submissions/:id`
Get submission by ID.

### `POST /api/submissions/:id/validate`
Trigger the backend validation engine for a submission.
- **Response:** Returns the `ValidationResult`.

### `GET /api/submissions/:id/validation`
Get the `ValidationResult` of a submission.

---

## WhatsApp
### `POST /api/whatsapp/webhook`
Twilio WhatsApp Webhook endpoint.
- **Request Body:** Standard Twilio URL-encoded data.
- **Authentication:** Must include `X-Twilio-Signature` header (validated in production).

---

## Error Codes
- `VALIDATION_ERROR`
- `FARMER_NOT_FOUND`
- `GAT_NOT_FOUND`
- `SUBMISSION_NOT_FOUND`
- `INVALID_COORDINATES`
- `LOCATION_OUTSIDE_GAT`
- `INVALID_IMAGE`
- `DUPLICATE_SUBMISSION`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INTERNAL_SERVER_ERROR`
