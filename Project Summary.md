# Smart E-Peek Pahani
## Zero-Friction Agriculture Governance
### Complete Prototype Implementation Specification

---

# 0. PROJECT MISSION

Build a hackathon-ready prototype of a smarter E-Peek Pahani workflow that addresses two major problems:

1. Farmers may face poor/unstable connectivity while performing field-level crop registration.
2. Farmers have different levels of digital literacy and many are already comfortable using WhatsApp.

The prototype must provide:

- A farmer-friendly Web App.
- A WhatsApp-based interaction layer.
- Offline-first data capture in the Web App.
- Location collection through WhatsApp for the prototype.
- Crop/photo collection.
- Automated validation.
- Gat/field boundary validation.
- Crop verification using AI/vision.
- Clear PASS/FAIL validation feedback.
- A backend dashboard for validation status.
- A convincing hackathon demo.
- A security architecture that is honest about prototype limitations while showing a clear production-hardening path.

---

# 1. CORE PRODUCT VISION

The product is NOT simply another crop-registration application.

The product is:

> A zero-friction agricultural governance platform that separates farmer accessibility from backend validation.

The farmer should not need to understand:

- APIs
- databases
- GPS
- geofencing
- metadata
- AI
- government backend systems

The farmer only needs to:

1. Start the process.
2. Provide crop information.
3. Share location.
4. Provide a crop photograph.
5. Receive immediate validation feedback.

The system handles the technical complexity.

---

# 2. IMPORTANT ARCHITECTURAL PRINCIPLE

The system must NOT claim that WhatsApp itself provides cryptographically trustworthy physical-location proof.

For the prototype:

> WhatsApp location is treated as a location input/evidence signal.

It is then cross-validated against:

- registered Gat/plot boundary
- declared crop
- submitted image
- timestamp
- image quality
- other available metadata

For production:

> The security-critical capture flow should be moved to a controlled native mobile application capable of OS-level mock-location detection and controlled camera capture.

This distinction must be preserved throughout the codebase, documentation and presentation.

---

# 3. HIGH-LEVEL ARCHITECTURE

```text
                           FARMER
                              |
               +--------------+--------------+
               |                             |
               v                             v
        WHATSAPP ASSISTANT              WEB APPLICATION
               |                             |
               |                             |
       Crop Information              Crop Information
       Voice/Text                    Photo Capture
       Location                      Location Input
       Photo                         Offline Storage
               |                             |
               +--------------+--------------+
                              |
                              v
                       UNIFIED BACKEND
                              |
                +-------------+-------------+
                |             |             |
                v             v             v
             Identity      Location       Image
             Validation    Validation     Validation
                |             |             |
                +-------------+-------------+
                              |
                              v
                       VALIDATION ENGINE
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
        Gat Boundary     Crop Verification   Data Rules
           Check             AI              Engine
             |                |                |
             +----------------+----------------+
                              |
                       +------+------+
                       |             |
                       v             v
                     PASS          FAIL
                       |             |
                       v             v
              Submission Ready   Correction
                       |
                       v
                  DATABASE
                       |
                       v
              ADMIN / REVIEW PANEL
```

---

# 4. USER CHANNELS

## 4.1 Web Application

Primary prototype interface.

Target:

- digitally comfortable farmers
- judges
- demo users
- administrators

Responsibilities:

- farmer onboarding
- crop selection
- location display
- photo capture/upload
- validation status
- offline-first storage
- submission status
- correction flow

---

## 4.2 WhatsApp

Target:

- low digital-literacy farmers
- farmers already comfortable with WhatsApp

Responsibilities:

- conversational onboarding
- Marathi/Hindi/English interaction
- crop information collection
- location collection
- photo collection
- submission status
- instructions
- link to web application where required

WhatsApp should NOT be presented as the security-critical trusted capture environment.

---

# 5. TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason to change it.

## Frontend

- React
- Vite
- JavaScript or TypeScript
- Tailwind CSS
- React Router
- IndexedDB
- Service Worker / PWA
- Leaflet + OpenStreetMap for map visualization
- Browser Geolocation API as an optional web-app signal
- `react-dropzone` or native file input for image upload

Recommended:

```text
React
Vite
Tailwind CSS
React Router
Dexie.js
Leaflet
Axios
```

---

## Backend

Use:

```text
Node.js
Express.js
MongoDB
Mongoose
```

Recommended additional packages:

```text
twilio
multer
cors
dotenv
helmet
express-rate-limit
zod
jsonwebtoken
bcrypt
axios
```

Optional:

```text
cloudinary
sharp
turf
```

---

## AI

Use one abstraction layer so the AI provider can be replaced.

Example:

```text
VisionProvider
    |
    +---- Gemini Vision
    |
    +---- Google Vision
    |
    +---- Hugging Face
    |
    +---- Mock Provider
```

For the hackathon, a mock provider should exist as a fallback.

---

# 6. REPOSITORY STRUCTURE

Use a monorepo:

```text
smart-e-peek-pahani/
│
├── README.md
├── .gitignore
├── package.json
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       │
│       ├── components/
│       │   ├── common/
│       │   ├── farmer/
│       │   ├── validation/
│       │   └── map/
│       │
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── FarmerOnboarding.jsx
│       │   ├── Submission.jsx
│       │   ├── SubmissionStatus.jsx
│       │   ├── OfflineQueue.jsx
│       │   ├── AdminDashboard.jsx
│       │   └── NotFound.jsx
│       │
│       ├── services/
│       │   ├── api.js
│       │   ├── submissionService.js
│       │   ├── whatsappService.js
│       │   └── locationService.js
│       │
│       ├── storage/
│       │   ├── db.js
│       │   └── submissionStore.js
│       │
│       ├── hooks/
│       │   ├── useOnlineStatus.js
│       │   ├── useLocation.js
│       │   └── useOfflineQueue.js
│       │
│       ├── utils/
│       │   ├── validation.js
│       │   ├── geo.js
│       │   └── image.js
│       │
│       ├── constants/
│       │   └── validationRules.js
│       │
│       └── styles/
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env
│   │
│   └── src/
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       │
│       ├── models/
│       │   ├── Farmer.js
│       │   ├── Submission.js
│       │   ├── Gat.js
│       │   ├── ValidationResult.js
│       │   └── WhatsAppSession.js
│       │
│       ├── routes/
│       │   ├── farmerRoutes.js
│       │   ├── submissionRoutes.js
│       │   ├── validationRoutes.js
│       │   ├── gatRoutes.js
│       │   └── whatsappRoutes.js
│       │
│       ├── controllers/
│       │   ├── farmerController.js
│       │   ├── submissionController.js
│       │   ├── validationController.js
│       │   └── whatsappController.js
│       │
│       ├── services/
│       │   ├── validation/
│       │   │   ├── validationEngine.js
│       │   │   ├── locationValidator.js
│       │   │   ├── cropValidator.js
│       │   │   ├── imageValidator.js
│       │   │   └── ruleValidator.js
│       │   │
│       │   ├── whatsapp/
│       │   │   ├── whatsappService.js
│       │   │   ├── whatsappParser.js
│       │   │   └── whatsappFlow.js
│       │   │
│       │   └── ai/
│       │       ├── visionProvider.js
│       │       ├── mockVisionProvider.js
│       │       └── geminiVisionProvider.js
│       │
│       ├── middleware/
│       │   ├── errorHandler.js
│       │   ├── auth.js
│       │   └── validateTwilio.js
│       │
│       └── utils/
│           ├── geo.js
│           ├── logger.js
│           └── response.js
│
└── docs/
    ├── architecture.md
    ├── api.md
    ├── security.md
    ├── demo.md
    └── judge-qa.md
```

---

# 7. DATABASE DESIGN

## 7.1 Farmer

```js
{
  _id,
  phoneNumber,
  name,
  preferredLanguage,
  selectedGatId,
  createdAt,
  updatedAt
}
```

Do not store unnecessary personal information.

---

# 7.2 Gat

```js
{
  _id,
  gatNumber,
  village,
  district,
  cropTypes: [
    "soybean",
    "cotton"
  ],
  boundary: {
    type: "Polygon",
    coordinates: [...]
  },
  center: {
    latitude,
    longitude
  },
  createdAt
}
```

For prototype, use seeded demo Gat polygons.

Do NOT attempt to integrate the real government land registry during the hackathon unless the API is officially available.

---

# 7.3 Submission

```js
{
  _id,

  farmerId,

  source: "WEB" | "WHATSAPP",

  crop: {
    declaredCrop,
    language
  },

  location: {
    latitude,
    longitude,
    source: "WHATSAPP" | "WEB_GPS" | "MANUAL",
    receivedAt,
    accuracy
  },

  image: {
    url,
    mimeType,
    size,
    capturedAt,
    metadata
  },

  gatId,

  status:
    "DRAFT"
    | "PENDING_VALIDATION"
    | "VALID"
    | "INVALID"
    | "MANUAL_REVIEW",

  validationResultId,

  createdAt,
  updatedAt
}
```

---

# 7.4 ValidationResult

```js
{
  _id,

  submissionId,

  overallStatus: "PASS" | "FAIL" | "REVIEW",

  checks: {

    location: {
      status,
      latitude,
      longitude,
      insideGat,
      distanceFromBoundary
    },

    image: {
      status,
      quality,
      validFormat,
      sizeValid
    },

    crop: {
      status,
      declaredCrop,
      detectedCrop,
      confidence
    },

    timestamp: {
      status,
      timestamp
    }
  },

  reasons: [],

  createdAt
}
```

---

# 8. VALIDATION PHILOSOPHY

Do NOT use a trust score.

Do NOT display:

```text
Trust Score: 87/100
```

Instead use explicit validation checks.

Example:

```text
Location              ✓ PASS
Gat Boundary          ✓ PASS
Image Quality         ✓ PASS
Crop Verification     ✓ PASS
Required Data         ✓ PASS

--------------------------------
FINAL RESULT           ✓ VALID
```

Or:

```text
Location              ✓ PASS
Gat Boundary          ✕ FAIL
Image Quality         ✓ PASS
Crop Verification     ✓ PASS

--------------------------------
FINAL RESULT           ✕ INVALID

Reason:
Location is outside registered Gat boundary.
```

---

# 9. VALIDATION RULES

## Rule 1 — Farmer identity

Required:

- valid farmer session
- phone number
- farmer record

---

## Rule 2 — Gat exists

The selected Gat must exist in the local database.

If not:

```text
Gat not found.
Please select a valid registered field.
```

---

## Rule 3 — Location exists

Location must contain:

```text
latitude
longitude
timestamp
source
```

Reject:

- missing latitude
- missing longitude
- invalid coordinate ranges

Valid ranges:

```text
latitude: -90 to +90
longitude: -180 to +180
```

---

# 10. GAT GEO-FENCE VALIDATION

The prototype should use actual polygon geometry rather than simply checking distance from a center point.

Example:

```text
Gat Polygon
     |
     +----------------+
     |                |
     |       X        |
     |                |
     +----------------+
              |
        Farmer Location
```

If point lies inside polygon:

```text
PASS
```

Otherwise:

```text
FAIL
```

Recommended library:

```text
@turf/boolean-point-in-polygon
```

Optional:

```text
@turf/distance
```

---

# 11. LOCATION SOURCE

The backend must record where location came from.

Possible values:

```text
WHATSAPP
WEB_GPS
MANUAL
```

Never silently mix these.

Example:

```js
location: {
  latitude: 19.123,
  longitude: 74.123,
  source: "WHATSAPP"
}
```

This makes the architecture auditable.

---

# 12. WHATSAPP WORKFLOW

## Conversation

Farmer sends:

```text
Hi
```

Bot:

```text
Namaskar! 🙏

Welcome to Smart E-Peek Pahani.

Please select your language:

1. मराठी
2. हिंदी
3. English
```

---

## Crop selection

```text
Please tell us your crop.

Example:
Cotton
Soybean
```

Farmer:

```text
Soybean
```

System stores:

```json
{
  "declaredCrop": "soybean"
}
```

---

# 13. VOICE NOTE

Optional prototype feature.

Farmer:

```text
[voice note]
"माझ्या शेतात सोयाबीन आहे"
```

Pipeline:

```text
Voice Note
    ↓
Audio Download
    ↓
Speech-to-Text
    ↓
Text
    ↓
Crop Extraction
    ↓
Normalized Crop
```

Example:

```text
"माझ्या शेतात सोयाबीन आहे"

↓

soybean
```

The AI/LLM must NOT directly decide final eligibility.

It only extracts structured information.

---

# 14. WHATSAPP LOCATION WORKFLOW

Bot:

```text
कृपया तुमच्या शेताचे location WhatsApp वर share करा.
```

Farmer sends location.

Twilio forwards location fields to the webhook. Current Twilio documentation specifies inbound location parameters including `Latitude`, `Longitude`, `Address`, and `Label`.

Backend:

```text
Receive webhook
      ↓
Validate Twilio request
      ↓
Extract latitude
      ↓
Extract longitude
      ↓
Validate coordinate ranges
      ↓
Save location evidence
      ↓
Associate with farmer session
```

Important:

Do NOT call this:

```text
Cryptographically verified location
```

Call it:

```text
WhatsApp location evidence
```

---

# 15. WHATSAPP PHOTO WORKFLOW

Farmer sends image.

Twilio webhook receives media metadata.

Twilio supports inbound WhatsApp media, including images, through media URLs supplied to the webhook.

Pipeline:

```text
WhatsApp Image
       ↓
Webhook
       ↓
Media URL
       ↓
Download
       ↓
Validate MIME type
       ↓
Validate size
       ↓
Store
       ↓
Associate with Submission
```

Allowed prototype formats:

```text
image/jpeg
image/png
image/webp
```

---

# 16. WHATSAPP SESSION STATE

Maintain conversation state.

Example:

```js
{
  phoneNumber,
  state: "WAITING_FOR_LOCATION",
  language: "mr",
  declaredCrop: "soybean",
  location: null,
  image: null,
  updatedAt
}
```

States:

```text
START
LANGUAGE_SELECTION
WAITING_FOR_CROP
WAITING_FOR_LOCATION
WAITING_FOR_IMAGE
READY_FOR_VALIDATION
VALIDATING
COMPLETED
FAILED
```

---

# 17. WHATSAPP STATE MACHINE

```text
START
  |
  v
LANGUAGE
  |
  v
CROP
  |
  v
LOCATION
  |
  v
PHOTO
  |
  v
READY
  |
  v
VALIDATION
  |
 +------+------+
 |             |
PASS          FAIL
 |             |
 v             v
DONE        CORRECTION
```

---

# 18. WEB APP FLOW

## Page 1 — Landing

Display:

```text
Smart E-Peek Pahani

Crop registration made simpler.

Continue with Web App
Continue through WhatsApp
```

Primary CTA:

```text
Start Crop Registration
```

Secondary:

```text
Use WhatsApp
```

---

# 19. FARMER ONBOARDING

Collect minimum information:

```text
Name
Mobile Number
Village
Gat Number
Crop
```

Avoid unnecessary forms.

---

# 20. LOCATION PAGE

Display map.

```text
Your selected field

[ MAP ]

Location received:
19.xxxxxx, 74.xxxxxx

Gat:
123

Checking boundary...
```

Then:

```text
✓ Location falls inside registered Gat.
```

---

# 21. PHOTO PAGE

Use:

```text
Take Crop Photo
```

Prototype can allow upload for demo reliability.

But clearly label:

```text
Prototype Capture
```

Production version:

```text
Native camera capture
```

---

# 22. IMAGE VALIDATION

Before uploading:

Check:

```text
MIME type
File size
Image dimensions
Image readability
```

Example rules:

```text
Allowed:
JPEG
PNG
WEBP

Max:
5 MB

Minimum:
640 x 480
```

---

# 23. IMAGE METADATA

If EXIF exists, extract:

```text
GPS
timestamp
camera metadata
```

But treat EXIF as:

```text
supporting evidence
```

NOT:

```text
tamper-proof truth
```

Example:

```js
metadata: {
  exifPresent: true,
  gpsPresent: true,
  captureTimestamp: "...",
  source: "image"
}
```

---

# 24. CROP AI VALIDATION

Input:

```text
Declared Crop:
soybean

Image:
crop-photo.jpg
```

Vision service returns:

```json
{
  "detectedCrop": "soybean",
  "confidence": 0.93
}
```

Then rules:

```text
IF detectedCrop == declaredCrop
AND confidence >= configured threshold
THEN cropCheck = PASS
```

Otherwise:

```text
cropCheck = REVIEW
```

Do NOT automatically claim AI is perfect.

---

# 25. IMAGE QUALITY CHECK

Before crop classification:

```text
Is image readable?
Is image too dark?
Is image too blurry?
Is image mostly empty?
Is crop visible?
```

Example:

```json
{
  "quality": "PASS",
  "brightness": "GOOD",
  "blur": "LOW",
  "cropVisible": true
}
```

---

# 26. VALIDATION ENGINE

Create:

```text
validationEngine.js
```

Input:

```js
{
  submission,
  farmer,
  gat
}
```

Output:

```js
{
  overallStatus: "PASS",
  checks: {
    identity: {...},
    location: {...},
    gat: {...},
    image: {...},
    crop: {...},
    timestamp: {...}
  },
  reasons: []
}
```

---

# 27. VALIDATION ORDER

Execute in this order:

```text
1. Identity
2. Required fields
3. Gat existence
4. Location validity
5. Gat geofence
6. Image validation
7. Image quality
8. Crop AI verification
9. Timestamp consistency
10. Final rule evaluation
```

This gives predictable behavior.

---

# 28. FINAL VALIDATION LOGIC

Example:

```js
const mandatoryChecks = [
  identity,
  requiredFields,
  gatExists,
  locationValid,
  insideGat,
  imageValid,
  imageQuality
];

const failed = mandatoryChecks.some(
  check => check.status === "FAIL"
);

if (failed) {
  return "FAIL";
}

if (cropCheck.status === "REVIEW") {
  return "REVIEW";
}

return "PASS";
```

---

# 29. IMPORTANT STATUS MODEL

Use:

```text
DRAFT
PENDING_VALIDATION
VALID
INVALID
REVIEW
SYNC_PENDING
SYNCED
```

Do NOT use only:

```text
approved/rejected
```

because government-level final approval is outside the prototype.

---

# 30. FARMER RESULT SCREEN

## PASS

```text
✓ Submission Validation Passed

Your crop registration has passed all available
validation checks.

✓ Location validated
✓ Gat boundary matched
✓ Image accepted
✓ Crop information matched

Your submission is ready for processing.
```

---

## FAIL

```text
✕ Submission Could Not Be Validated

Reason:

Your selected location does not fall inside
the registered Gat boundary.

Please correct the location and try again.
```

---

## REVIEW

```text
⚠ Additional Verification Required

The submitted crop image could not be
verified with sufficient confidence.

Please retake a clearer photo.
```

---

# 31. OFFLINE-FIRST WEB APP

The web app must continue working if connectivity disappears.

Use:

```text
Service Worker
+
IndexedDB
```

Recommended:

```text
Dexie.js
```

---

# 32. OFFLINE DATA MODEL

Store:

```js
{
  localId,
  farmerId,
  submissionData,
  imageBlob,
  location,
  status: "SYNC_PENDING",
  createdAt,
  retryCount
}
```

---

# 33. OFFLINE FLOW

```text
Farmer enters field
       ↓
Internet unavailable
       ↓
Web App remains usable
       ↓
Data saved to IndexedDB
       ↓
Photo saved locally
       ↓
Submission marked SYNC_PENDING
       ↓
Farmer leaves field
       ↓
Internet returns
       ↓
Sync starts
       ↓
Backend receives submission
       ↓
Validation runs
       ↓
Result returned
```

---

# 34. ONLINE/OFFLINE UI

Always show:

```text
🟢 Online
```

or:

```text
🟠 Offline — Your data is safely stored on this device.
```

When offline:

```text
Submission saved locally.

It will automatically sync when internet returns.
```

---

# 35. SYNC ENGINE

Create:

```text
syncService.js
```

Pseudo-flow:

```js
async function syncPendingSubmissions() {

  const pending = await getPendingSubmissions();

  for (const submission of pending) {

    try {

      await uploadSubmission(submission);

      await markAsSynced(submission.localId);

    } catch (error) {

      await incrementRetryCount(submission.localId);

    }
  }
}
```

Trigger on:

```text
window.online
```

and periodically when the app is active.

---

# 36. DUPLICATE PROTECTION

Every submission must have:

```text
clientSubmissionId
```

Example:

```text
SPP-2026-USER123-8F7A21
```

Backend must reject duplicate `clientSubmissionId`.

This prevents:

```text
offline retry
      ↓
same submission
      ↓
duplicate government record
```

---

# 37. BACKEND API

## Farmer

```text
POST /api/farmers
GET  /api/farmers/:id
```

---

## Gat

```text
GET /api/gats
GET /api/gats/:id
```

---

## Submission

```text
POST /api/submissions
GET /api/submissions/:id
```

---

## Validation

```text
POST /api/submissions/:id/validate
GET  /api/submissions/:id/validation
```

---

## WhatsApp

```text
POST /api/whatsapp/webhook
```

---

# 38. WHATSAPP WEBHOOK

The webhook should:

```text
POST /api/whatsapp/webhook
```

Receive:

```text
From
Body
NumMedia
MediaUrl0
MediaContentType0
Latitude
Longitude
Address
Label
MessageSid
```

Twilio documents inbound WhatsApp webhooks and the location parameters above.

---

# 39. TWILIO WEBHOOK SECURITY

Do not blindly trust any POST request to:

```text
/api/whatsapp/webhook
```

Validate the Twilio request signature.

Use Twilio's request validation mechanism.

Conceptually:

```text
Incoming Request
       ↓
Validate Twilio Signature
       ↓
VALID ─────→ Process
       |
     INVALID
       ↓
HTTP 403
```

Never expose Twilio credentials in frontend code.

---

# 40. ENVIRONMENT VARIABLES

Backend:

```env
PORT=5000

MONGODB_URI=...

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...

GEMINI_API_KEY=...

JWT_SECRET=...

FRONTEND_URL=http://localhost:5173
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

Never commit:

```text
.env
```

to Git.

---

# 41. TWILIO SANDBOX

For hackathon prototype testing, use the Twilio WhatsApp Sandbox.

Current Twilio documentation states that the Sandbox is intended for testing/discovery and supports webhook configuration. Users must join the specific Sandbox before messaging it.

Workflow:

```text
Twilio Account
      ↓
WhatsApp Sandbox
      ↓
Join Sandbox
      ↓
Configure Webhook
      ↓
Backend
```

---

# 42. LOCAL WEBHOOK TESTING

For local development:

```text
Backend
localhost:5000
     ↓
ngrok
     ↓
Public HTTPS URL
     ↓
Twilio
```

Example:

```bash
ngrok http 5000
```

Then configure:

```text
https://YOUR-NGROK-URL/api/whatsapp/webhook
```

Twilio's own quickstart documents using ngrok to expose a local webhook for Sandbox testing and warns that it is for testing rather than production deployment.

---

# 43. WHATSAPP MESSAGE ROUTER

Create:

```text
whatsappFlow.js
```

Pseudo-logic:

```js
switch (session.state) {

  case "START":
    return sendLanguagePrompt();

  case "LANGUAGE_SELECTION":
    return handleLanguage();

  case "WAITING_FOR_CROP":
    return handleCrop();

  case "WAITING_FOR_LOCATION":
    return handleLocation();

  case "WAITING_FOR_IMAGE":
    return handleImage();

  case "READY_FOR_VALIDATION":
    return validateSubmission();

  default:
    return sendHelp();
}
```

---

# 44. WHATSAPP BOT LANGUAGE

Prototype should support:

```text
Marathi
Hindi
English
```

Store:

```js
preferredLanguage
```

Use translation dictionaries.

Example:

```js
const messages = {
  mr: {
    welcome: "...",
    askCrop: "...",
    askLocation: "...",
    askPhoto: "...",
    success: "..."
  },

  hi: {...},

  en: {...}
};
```

Do not hardcode hundreds of messages throughout controllers.

---

# 45. WHATSAPP + WEB APP LINKING

When WhatsApp user starts a submission:

Generate:

```text
sessionId
```

Example:

```text
WSP-9F73K2
```

Web app link:

```text
https://your-app.com/submit?session=WSP-9F73K2
```

The web app loads the WhatsApp-created session.

This creates the bridge:

```text
WhatsApp
   ↓
Session ID
   ↓
Web App
   ↓
Submission
   ↓
Backend
```

This is a very strong prototype feature.

---

# 46. SESSION SECURITY

Do not put sensitive farmer data directly into URL query parameters.

Use:

```text
random opaque session token
```

Example:

```text
https://app.example.com/submit?s=7f82a9...
```

Backend resolves token → session.

Set expiration:

```text
15–30 minutes
```

for unfinished submission sessions.

---

# 47. ADMIN DASHBOARD

Build a simple dashboard.

Display:

```text
Total submissions
Valid
Invalid
Review
Pending Sync
```

Example:

```text
--------------------------------------
Smart E-Peek Governance Dashboard
--------------------------------------

Total       128
Valid        94
Review       21
Invalid      13

--------------------------------------

Recent Submissions

Farmer       Crop       Gat     Status
------------------------------------------------
Farmer 01    Soybean    123     ✓ VALID
Farmer 02    Cotton     124     ⚠ REVIEW
Farmer 03    Soybean    125     ✕ INVALID
```

---

# 48. ADMIN SUBMISSION DETAILS

Clicking a submission should show:

```text
Farmer
Crop
Gat
Location
Image
Timestamp

Validation:

✓ Identity
✓ Location
✓ Gat Boundary
✓ Image Quality
✓ Crop Verification
```

If failed:

```text
Failure reason:
Location outside Gat boundary
```

---

# 49. MAP VISUALIZATION

Admin should see:

```text
Gat Polygon
      +
Farmer Location Marker
```

If valid:

```text
Location inside Gat
```

If invalid:

```text
Location outside Gat
```

This is extremely useful for the hackathon demo because judges can visually understand the validation.

---

# 50. DEMO DATA

Do not depend on live government data.

Seed:

```text
3 villages
10 Gat records
5 farmers
2 crops
```

Example:

```text
Gat 101 → Soybean
Gat 102 → Cotton
Gat 103 → Soybean
```

Use realistic-looking but clearly demo/test records.

---

# 51. DEMO SCENARIO 1 — SUCCESS

Prepare:

```text
Farmer:
Demo Farmer

Crop:
Soybean

Gat:
101

Location:
Inside Gat 101

Photo:
Soybean image

AI:
Soybean 93%
```

Flow:

```text
WhatsApp
   ↓
Crop = Soybean
   ↓
Location received
   ↓
Web App
   ↓
Photo uploaded
   ↓
Validation
   ↓
✓ VALID
```

This is the main happy-path demo.

---

# 52. DEMO SCENARIO 2 — WRONG LOCATION

Use a location outside Gat.

Result:

```text
Location: FAIL

Reason:
Submitted location does not fall
inside registered Gat 101.
```

This demonstrates geofencing.

---

# 53. DEMO SCENARIO 3 — WRONG CROP

Declare:

```text
Soybean
```

Upload:

```text
Cotton
```

AI:

```text
cotton: 91%
soybean: 4%
```

Result:

```text
⚠ Crop mismatch detected.

Declared:
Soybean

Detected:
Cotton
```

Do not automatically claim legal fraud.

Use:

```text
Validation failed / additional verification required.
```

---

# 54. DEMO SCENARIO 4 — OFFLINE

Turn off internet.

Open web app.

Show:

```text
🟠 Offline
```

Capture data.

Show:

```text
Saved securely on this device.
Waiting for connection...
```

Turn internet back on.

Show:

```text
Syncing...
       ↓
Uploaded
       ↓
Validation complete
       ↓
✓ VALID
```

THIS should be one of the strongest moments of the demo.

---

# 55. DEMO SCENARIO 5 — WHATSAPP

Live WhatsApp demo:

```text
Farmer:
Hi

Bot:
Namaskar! 🙏
Please select your crop.

Farmer:
Soybean

Bot:
Please share your field location.

Farmer:
[location]

Bot:
Location received ✓

Please send your crop photo.

Farmer:
[photo]

Bot:
Your submission is being validated...
```

Then show web/admin dashboard updating.

---

# 56. EMOTIONAL DEMO STORY

Do NOT start with architecture.

Start with:

```text
Imagine a farmer standing in his field.

The crop is ready.

The required registration has to be completed.

But the field has poor connectivity.

The problem isn't that the farmer doesn't want to register.

The problem is that the digital system assumes
the farmer has a stable connection exactly where
the farmer works.
```

Then:

```text
That's the gap we are solving.
```

---

# 57. PPT ARCHITECTURE SLIDE

Use exactly four layers:

```text
1. ACCESSIBILITY
   WhatsApp + Web App

2. FIELD DATA
   Location + Photo + Crop

3. VALIDATION
   Gat + Image + Crop + Rules

4. GOVERNANCE
   Validated Submission + Dashboard
```

Keep architecture visually simple.

---

# 58. SECURITY SLIDE

Title:

```text
Multi-Signal Validation
```

Show:

```text
             Submission
                  |
        +---------+---------+
        |         |         |
     Location   Image     Crop
        |         |         |
       Gat      Quality     AI
        |         |         |
        +---------+---------+
                  |
            Rule Engine
                  |
          +-------+-------+
          |               |
        VALID            FAIL
```

Bottom:

> No single client-provided signal is treated as sufficient evidence.

This is much stronger than claiming WhatsApp itself is spoof-proof.

---

# 59. OFFLINE-FIRST SLIDE

Show:

```text
Field
 |
 | No Internet
 v
Web App
 |
 v
IndexedDB
 |
 v
Local Submission Queue
 |
 | Internet restored
 v
Backend
 |
 v
Validation
```

Headline:

> Capture first. Synchronize when connected.

---

# 60. WHATSAPP SLIDE

Title:

```text
Designed Around Existing Farmer Behavior
```

Show:

```text
WhatsApp
   |
   +--- Marathi conversation
   |
   +--- Crop information
   |
   +--- Location
   |
   +--- Photo
   |
   v
Unified Submission
```

Do not call WhatsApp:

```text
secure location provider
```

Call it:

```text
familiar farmer interaction layer
```

---

# 61. PRODUCTION ROADMAP SLIDE

Hackathon prototype:

```text
Web App
+
WhatsApp
+
Demo Gat Dataset
+
AI Vision
+
Validation Engine
```

Production evolution:

```text
Native Android/iOS Capture
        +
OS-level mock-location checks
        +
Controlled camera capture
        +
Official government integrations
        +
Production identity verification
        +
Secure audit trail
```

This makes your prototype limitations look intentional rather than accidental.

---

# 62. SECURITY THREATS

Document these honestly.

## Threat 1 — Fake WhatsApp location

Prototype mitigation:

```text
Gat boundary validation
+
cross-signal validation
```

Production mitigation:

```text
native app
+
OS mock-location detection
+
controlled capture
```

---

## Threat 2 — Fake crop claim

Mitigation:

```text
AI crop verification
```

plus:

```text
manual review for low confidence
```

---

## Threat 3 — Fake/old image

Mitigation:

```text
image metadata when available
+
capture workflow
+
timestamp consistency
+
production native camera
```

---

## Threat 4 — Duplicate submission

Mitigation:

```text
clientSubmissionId
+
backend uniqueness constraint
```

---

## Threat 5 — Tampered frontend

Never trust:

```text
frontend validation
```

Backend must repeat all critical validation.

---

## Threat 6 — Malicious webhook

Mitigation:

```text
Twilio signature validation
```

---

## Threat 7 — Huge media upload

Mitigation:

```text
MIME validation
+
file-size limits
+
image processing
```

---

## Threat 8 — AI hallucination

Mitigation:

```text
AI output is evidence,
not final legal authority.
```

Low confidence:

```text
REVIEW
```

---

# 63. API SECURITY

Every backend endpoint must:

- validate request body
- sanitize inputs
- enforce size limits
- authenticate protected endpoints
- rate-limit public endpoints
- never expose secrets
- log validation failures
- avoid logging unnecessary personal information

---

# 64. FRONTEND SECURITY

Never put:

```text
TWILIO_AUTH_TOKEN
GEMINI_API_KEY
MONGODB_URI
JWT_SECRET
```

inside frontend environment variables.

Only expose:

```text
VITE_API_URL
```

and other intentionally public configuration.

---

# 65. ERROR HANDLING

Every API response should follow:

```json
{
  "success": true,
  "message": "Submission validated",
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "message": "Location is outside registered Gat",
  "code": "LOCATION_OUTSIDE_GAT"
}
```

Use consistent error codes.

---

# 66. ERROR CODES

Create:

```text
INVALID_LOCATION
LOCATION_OUTSIDE_GAT
MISSING_IMAGE
INVALID_IMAGE
IMAGE_TOO_LARGE
IMAGE_QUALITY_LOW
CROP_MISMATCH
CROP_LOW_CONFIDENCE
GAT_NOT_FOUND
DUPLICATE_SUBMISSION
INVALID_SESSION
TWILIO_SIGNATURE_INVALID
AI_SERVICE_UNAVAILABLE
SYNC_FAILED
```

---

# 67. AI FAILURE FALLBACK

If AI service is unavailable:

Do NOT crash.

Return:

```text
REVIEW
```

UI:

```text
Crop verification service is temporarily unavailable.

Your submission has been saved.
```

For hackathon:

Implement:

```text
MockVisionProvider
```

so the demo does not depend entirely on external AI uptime.

---

# 68. MOCK VISION PROVIDER

For deterministic demo:

```js
class MockVisionProvider {

  async classify(image) {

    return {
      detectedCrop: "soybean",
      confidence: 0.93
    };

  }

}
```

Allow switching:

```env
VISION_PROVIDER=mock
```

or:

```env
VISION_PROVIDER=gemini
```

This is critical for demo reliability.

---

# 69. LOGGING

Log:

```text
submission ID
validation status
failure reason
AI provider status
sync status
WhatsApp message SID
```

Do NOT log:

```text
Twilio auth token
API keys
unnecessary personal data
```

---

# 70. TESTING

Minimum tests:

## Location

```text
inside Gat
outside Gat
boundary point
invalid latitude
invalid longitude
missing location
```

## Image

```text
valid JPEG
invalid MIME
oversized image
corrupt image
missing image
```

## Crop

```text
matching crop
mismatched crop
low confidence
AI unavailable
```

## WhatsApp

```text
text message
location message
image message
unknown message
invalid session
invalid Twilio signature
```

## Offline

```text
save offline
restore connection
sync
duplicate retry
failed sync
```

---

# 71. FRONTEND COMPONENTS

Build reusable components:

```text
Button
Card
Input
Select
Modal
StatusBadge
LoadingSpinner
ErrorMessage
OfflineBanner
LocationCard
CropSelector
ImageUploader
ValidationCheck
ValidationSummary
MapView
SubmissionCard
```

---

# 72. VALIDATION CHECK COMPONENT

Example:

```text
✓ Location Verified
  Inside registered Gat 101

✓ Image Accepted
  JPEG / Good quality

✓ Crop Verified
  Soybean — 93%

✓ Required Data
  Complete
```

Use green for PASS.

Yellow for REVIEW.

Red for FAIL.

---

# 73. MOBILE-FIRST UI

Even though this is a Web App, design primarily for:

```text
360px – 430px
```

because farmers will primarily use smartphones.

Large:

- buttons
- labels
- icons
- status indicators

Avoid:

- dense tables on farmer screens
- tiny text
- complex navigation
- technical terms

---

# 74. FARMER LANGUAGE

Avoid:

```text
Geospatial validation failed.
```

Instead:

```text
Your location is outside the selected field.

Please move inside your registered field
and try again.
```

Avoid:

```text
AI confidence threshold violation.
```

Instead:

```text
We could not clearly identify the crop.

Please take a clearer photo.
```

---

# 75. ADMIN LANGUAGE

Admin can see technical information:

```text
Location:
19.xxxxxx, 74.xxxxxx

Gat:
101

Distance:
8.4m

Crop:
Soybean

AI:
Soybean 93%

Source:
WHATSAPP
```

---

# 76. DEVELOPMENT PHASES

## PHASE 1 — Foundation

Build:

```text
Repository
Frontend
Backend
MongoDB
Basic routing
Environment variables
```

Deliverable:

```text
Frontend runs
Backend runs
Database connects
```

---

# 77. PHASE 2 — DATABASE

Build:

```text
Farmer
Gat
Submission
ValidationResult
WhatsAppSession
```

Seed demo data.

Deliverable:

```text
Database foundation complete
```

---

# 78. PHASE 3 — WEB APP

Build:

```text
Landing
Onboarding
Crop selection
Location
Photo
Submission
Result
```

Deliverable:

```text
Complete manual web submission flow
```

---

# 79. PHASE 4 — GEO VALIDATION

Implement:

```text
Gat polygon
point-in-polygon
distance
location validation
```

Deliverable:

```text
Correct location → PASS
Wrong location → FAIL
```

---

# 80. PHASE 5 — OFFLINE

Implement:

```text
PWA
Service Worker
IndexedDB
offline queue
sync engine
```

Deliverable:

```text
Submission works without internet.
```

---

# 81. PHASE 6 — AI

Implement:

```text
VisionProvider
MockVisionProvider
RealVisionProvider
```

Deliverable:

```text
Soybean image → soybean
Cotton image → cotton
Low confidence → review
```

---

# 82. PHASE 7 — WHATSAPP

Implement:

```text
Twilio account
Sandbox
Webhook
Signature validation
Conversation state
Location parser
Media parser
Session management
```

Deliverable:

```text
WhatsApp → backend → database
```

Twilio's current WhatsApp docs confirm inbound webhooks, location fields, and media handling.

---

# 83. PHASE 8 — WHATSAPP ↔ WEB

Implement:

```text
WhatsApp session
        ↓
opaque session token
        ↓
Web App
        ↓
submission
```

Deliverable:

```text
Farmer starts through WhatsApp
and completes the flow through Web App.
```

---

# 84. PHASE 9 — ADMIN DASHBOARD

Implement:

```text
statistics
submission list
submission details
map
validation results
```

Deliverable:

```text
Judge can see governance side.
```

---

# 85. PHASE 10 — DEMO HARDENING

Test:

```text
happy path
wrong location
wrong crop
offline
WhatsApp
AI failure
network failure
duplicate submission
```

No demo should depend on one external API.

---

# 86. DEMO FALLBACKS

If WhatsApp fails:

```text
Use prerecorded WhatsApp screenshot/video
```

If AI fails:

```text
Use MockVisionProvider
```

If internet fails:

```text
Show offline queue
```

If map tiles fail:

```text
Show static fallback map
```

The demo must never completely collapse because one external service is unavailable.

---

# 87. FINAL 5-MINUTE DEMO

## 0:00–0:45

Tell farmer story.

---

## 0:45–1:30

Show WhatsApp.

```text
Hi
→ crop
→ location
→ photo
```

---

## 1:30–2:30

Open Web App.

Show submission automatically connected to WhatsApp session.

---

## 2:30–3:15

Show validation:

```text
Location ✓
Gat ✓
Image ✓
Crop ✓
```

---

## 3:15–4:00

Demonstrate wrong location.

```text
FAIL
```

---

## 4:00–4:30

Turn internet off.

Capture submission.

```text
Saved Offline
```

Turn internet on.

```text
Syncing...
```

---

## 4:30–5:00

Show Admin Dashboard.

Finish with:

> We are not asking farmers to adapt to the limitations of the digital system. We are adapting the digital system to the reality of the farmer.

---

# 88. JUDGE QUESTIONS

## Q: Why WhatsApp?

Answer:

> Farmers already understand WhatsApp. We use it as an accessibility and interaction layer so that digital literacy is not a barrier.

---

## Q: Is WhatsApp location completely spoof-proof?

Answer:

> No client-provided location should be treated as absolute physical proof. In our prototype, WhatsApp location is one evidence signal that is cross-validated against the registered Gat boundary and other submission evidence. In production, security-critical capture can move to a native application with OS-level mock-location detection.

---

## Q: Why not just use the existing application?

Answer:

> Our focus is not simply replacing the interface. We are addressing connectivity resilience, accessibility and immediate validation while preserving the field-level verification logic.

---

## Q: What happens without internet?

Answer:

> The Web App stores the submission locally using IndexedDB. Once connectivity returns, the queued submission synchronizes automatically.

---

## Q: What prevents fake crop declarations?

Answer:

> The declared crop is compared with the submitted image using an AI vision layer. Low-confidence results are routed for additional verification rather than blindly accepted.

---

## Q: Can AI be wrong?

Answer:

> Yes. That is why AI is not treated as the sole authority. It is a supporting evidence layer. Low-confidence results are marked for review.

---

## Q: Can someone manipulate EXIF?

Answer:

> EXIF is treated only as supporting metadata, not as tamper-proof proof. Production security would require controlled native capture and stronger device-level attestation.

---

## Q: Does your system guarantee government payment?

Answer:

> No. Our system validates the submission against the available rules and prepares a verified record. Final government eligibility and payment remain subject to official scheme rules and government processing.

---

## Q: Why use AI?

Answer:

> AI reduces the amount of manual crop verification required and can identify obvious mismatches early, improving both farmer feedback and administrative efficiency.

---

# 89. WHAT NOT TO CLAIM

Never say:

```text
WhatsApp location cannot be spoofed.
```

Never say:

```text
EXIF is tamper-proof.
```

Never say:

```text
AI always identifies crops correctly.
```

Never say:

```text
Our app guarantees government payment.
```

Never say:

```text
We have completely eliminated fraud.
```

Instead say:

```text
We reduce fraud opportunities through multi-signal validation.
```

---

# 90. WHAT TO CLAIM

You CAN confidently say:

```text
Offline-first capture reduces connectivity friction.

WhatsApp provides a familiar interaction layer.

Gat geofencing validates whether the submitted location
falls inside the registered field.

AI provides automated crop verification.

The backend repeats critical validation instead of trusting
the frontend.

The system gives immediate validation feedback.

The architecture is designed to evolve into a
production-grade native application.
```

---

# 91. DEFINITION OF DONE

The prototype is considered complete only when:

## Frontend

- [ ] Landing page
- [ ] Farmer onboarding
- [ ] Crop selection
- [ ] Location page
- [ ] Photo upload
- [ ] Validation page
- [ ] Result page
- [ ] Offline indicator
- [ ] Offline queue
- [ ] Mobile responsive UI

## Backend

- [ ] MongoDB connected
- [ ] Farmer model
- [ ] Gat model
- [ ] Submission model
- [ ] Validation model
- [ ] REST APIs
- [ ] Validation engine
- [ ] Geo validation
- [ ] AI abstraction
- [ ] Error handling

## WhatsApp

- [ ] Twilio configured
- [ ] Sandbox configured
- [ ] Webhook working
- [ ] Signature validation
- [ ] Text handling
- [ ] Crop extraction
- [ ] Location extraction
- [ ] Image extraction
- [ ] Session state
- [ ] WhatsApp → Web session bridge

## Offline

- [ ] PWA
- [ ] IndexedDB
- [ ] Image local storage
- [ ] Pending queue
- [ ] Sync engine
- [ ] Duplicate prevention

## Dashboard

- [ ] Submission count
- [ ] Valid count
- [ ] Invalid count
- [ ] Review count
- [ ] Submission table
- [ ] Submission details
- [ ] Map
- [ ] Validation breakdown

## Demo

- [ ] Happy path
- [ ] Wrong location
- [ ] Wrong crop
- [ ] Offline mode
- [ ] WhatsApp
- [ ] Admin dashboard
- [ ] AI fallback
- [ ] API fallback

---

# 92. IMPLEMENTATION PRIORITY

Do NOT build everything simultaneously.

Priority:

```text
P0 — MUST HAVE
────────────────────────────

1. Backend
2. MongoDB
3. Web App
4. Submission flow
5. Gat validation
6. Validation engine
7. Result screen


P1 — VERY IMPORTANT
────────────────────────────

8. Offline storage
9. Sync
10. AI crop validation
11. Admin dashboard


P2 — DEMO DIFFERENTIATOR
────────────────────────────

12. WhatsApp
13. WhatsApp → Web bridge
14. Marathi conversational flow


P3 — FUTURE
────────────────────────────

15. Native mobile app
16. OS mock-location detection
17. Official government integration
18. Strong device attestation
19. Production identity verification
```

---

# 93. CRITICAL RULE FOR THE TEAM

Do NOT spend the entire hackathon trying to make the WhatsApp security perfect.

The prototype's strongest architecture is:

```text
                SMART E-PEEK
                     |
          +----------+----------+
          |                     |
       ACCESS                 VALIDATE
          |                     |
      WhatsApp               Web App
          |                     |
          +----------+----------+
                     |
              Unified Backend
                     |
          +----------+----------+
          |          |          |
        Gat        Image      Rules
      Boundary      AI       Engine
          |          |          |
          +----------+----------+
                     |
               Validation
                     |
             +-------+-------+
             |               |
           VALID            FAIL
```

The WhatsApp module exists because:

> **Farmers already use it.**

The Web App exists because:

> **We need a richer submission and validation experience for the prototype.**

The backend exists because:

> **No client should be trusted blindly.**

The validation engine exists because:

> **The farmer needs an immediate, understandable result.**

---

# 94. FINAL PRODUCT STATEMENT

Use this as the final project definition:

> **Smart E-Peek Pahani is an offline-first, farmer-centric crop registration platform that combines the familiarity of WhatsApp with a structured web application and a multi-signal validation engine. Farmers can interact through the channel they are most comfortable with, while the backend validates location, field boundaries, image quality, crop information and other available evidence before preparing the submission for processing.**

---

# 95. FINAL ARCHITECTURAL PRINCIPLE

The entire project should follow this rule:

> **Accessibility should be simple for the farmer.**
>
> **Validation should be strict for the system.**
>
> **No single client-provided signal should be treated as absolute truth.**
>
> **The farmer should receive actionable feedback immediately.**
>
> **The architecture should clearly separate prototype capabilities from production-grade security.**

---

# 96. FINAL IMPLEMENTATION ORDER

Execute in exactly this order:

```text
STEP 01
Create monorepo.

STEP 02
Create React frontend.

STEP 03
Create Node/Express backend.

STEP 04
Connect MongoDB.

STEP 05
Create Farmer model.

STEP 06
Create Gat model.

STEP 07
Seed demo Gat polygons.

STEP 08
Create Submission model.

STEP 09
Create ValidationResult model.

STEP 10
Create farmer onboarding UI.

STEP 11
Create crop selection UI.

STEP 12
Create location UI.

STEP 13
Create image upload/capture UI.

STEP 14
Create submission API.

STEP 15
Create point-in-polygon validation.

STEP 16
Create validation engine.

STEP 17
Create PASS/FAIL/REVIEW UI.

STEP 18
Implement IndexedDB.

STEP 19
Implement offline submission queue.

STEP 20
Implement synchronization.

STEP 21
Implement duplicate submission protection.

STEP 22
Create AI provider abstraction.

STEP 23
Create MockVisionProvider.

STEP 24
Integrate real Vision API.

STEP 25
Create Admin Dashboard.

STEP 26
Create Twilio Sandbox.

STEP 27
Create WhatsApp webhook.

STEP 28
Add Twilio signature validation.

STEP 29
Implement WhatsApp state machine.

STEP 30
Implement WhatsApp crop extraction.

STEP 31
Implement WhatsApp location extraction.

STEP 32
Implement WhatsApp image extraction.

STEP 33
Create WhatsAppSession model.

STEP 34
Connect WhatsApp session to Web App.

STEP 35
Implement Marathi/Hindi/English messages.

STEP 36
Test complete WhatsApp flow.

STEP 37
Test offline flow.

STEP 38
Test wrong-location flow.

STEP 39
Test wrong-crop flow.

STEP 40
Test AI failure fallback.

STEP 41
Test webhook failure.

STEP 42
Prepare demo dataset.

STEP 43
Prepare demo script.

STEP 44
Prepare architecture slide.

STEP 45
Prepare security slide.

STEP 46
Prepare judge Q&A.

STEP 47
Deploy frontend.

STEP 48
Deploy backend.

STEP 49
Configure production-like webhook URL for demo.

STEP 50
Run complete end-to-end rehearsal.
```

---

# 97. SUCCESS CRITERIA

At the end of the hackathon, a judge must be able to see:

```text
A farmer can start easily.
        ↓
WhatsApp is familiar.
        ↓
Web App is simple.
        ↓
Poor connectivity does not destroy the submission.
        ↓
Location is checked against the registered field.
        ↓
Crop image is automatically checked.
        ↓
The backend validates the submission.
        ↓
The farmer immediately understands the result.
        ↓
The administrator can see why the system accepted
or rejected the submission.
```

That is the complete Smart E-Peek Pahani prototype.
