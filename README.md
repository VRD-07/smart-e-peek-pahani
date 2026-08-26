<div align="center">
  <h1>🌾 Smart e-Peek Pahani</h1>
  <p><strong>Secure, AI-assisted, Offline-first Digital Crop Survey Platform</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen.svg)](https://www.mongodb.com/)
  [![Gemini AI](https://img.shields.io/badge/AI-Gemini_Vision-blueviolet.svg)](https://deepmind.google/technologies/gemini/)
  
  <br />
</div>

## 🎥 Demo Video

> **Watch the complete Round 2 demonstration:**  
> [👉 YOUR_DEMO_VIDEO_LINK_HERE](YOUR_DEMO_VIDEO_LINK_HERE)

---

## 🛑 1. The Problem
Traditional and field-level crop surveying in agriculture faces immense logistical and technical challenges:
- **Unreliable Connectivity:** Farms frequently lack stable internet, making real-time digital submissions impossible.
- **Location Spoofing:** It is difficult to verify whether a survey was genuinely captured at the correct land parcel (Gat) or faked off-site.
- **Manual Verification:** Human verification of millions of crop images is slow, expensive, and prone to error.
- **Data Integrity:** Poor networks often lead to duplicate submissions and unreliable synchronization.
- **Security Risks:** Unauthorized clients submitting arbitrary or malicious farmer/Gat information.
- **Accessibility:** Many farmers find web applications difficult to navigate and prefer familiar platforms like WhatsApp.

## 💡 2. Our Solution
**Smart e-Peek Pahani** is a comprehensive crop surveying ecosystem designed from the ground up to solve these specific agricultural field challenges. It seamlessly combines:

1. **GPS + Gat Geofencing** for dual-layer location verification
2. **Gemini Vision AI** for automated crop image analysis
3. **Offline-First PWA** for surveys in zero-connectivity areas
4. **WhatsApp Bot** for an accessible, low-friction farmer interface
5. **Secure Backend Validation** as the authoritative check on submitted data

## 🎯 3. Why This Approach?
This architecture does not just digitize a paper process—it hardens it. By enforcing an **authoritative backend verification** (Turf.js) over UX pre-checks, ensuring **idempotent syncs**, and providing **AI-assisted reviews** instead of blind approvals, we've created a system that is robust against spoofing, network failures, and bad data.

---

## ✨ 4. Key Features

| Feature | Description |
|---|---|
| **Multi-Gat Architecture** | Farmers can manage multiple land parcels. Users must explicitly select the target Gat before submission. |
| **Dual-Layer GPS Verification** | Frontend UX geofencing pre-check (50m accuracy) + authoritative backend Turf.js validation. |
| **Gemini Vision AI** | Automated image verification to cross-check the declared crop against the uploaded photo. |
| **Offline-First PWA** | Built on Dexie/IndexedDB to cache submissions locally and automatically sync when online. |
| **Idempotent Sync** | Secure backend handles duplicate offline retries (HTTP 409) preventing duplicate records. |
| **WhatsApp Workflow** | Full survey flow directly inside WhatsApp with multi-language support. |
| **WebBridge** | Seamlessly connects a WhatsApp session to the rich web UI for complex status viewing. |
| **Reactive Dashboard** | Frontend UI instantly updates without refreshing via Dexie `useLiveQuery`. |
| **Officer Dashboard** | Role-protected `GET /api/submissions` endpoint plus a global review console: every submission across all farmers and Gats, filterable by outcome / Gat / district / date range, viewable as a sortable table or a Leaflet map with outcome-coloured pins. |
| **Farmer Awareness Module** | Scheduled WhatsApp sweep that reminds farmers with nothing on file before a season's filing deadline closes, plus a one-time "what E-Peek Pahani is and why it matters" message on first contact from a new number. Every send is de-duplicated and logged, and messages go out in the farmer's own language. |
| **Calamity-Relief Matching** | When a calamity is declared, the declared polygon is intersected against every Gat boundary using the same Turf.js geometry as the validation engine. Farmers whose **verified** filing sits inside the zone are told on WhatsApp that their record may qualify them for relief, and the officer dashboard gains a *Relief eligible* badge and filter. Crop-scoped declarations only sweep in the crops they name, and a filing created *after* the declaration is never matched. |

---

## 🌐 5. Complete Web Workflow

1. **OTP Login**: Farmer authenticates via mobile OTP.
2. **Gat Selection**: Farmer selects one of their associated land parcels.
3. **GPS Pre-Gate**: PWA captures device coordinates and checks if they fall within the Gat boundary (must have <50m accuracy).
4. **Survey Form**: Farmer declares the crop and uploads a live photo.
5. **Offline Queue**: If offline, the submission rests in the IndexedDB `SYNC_PENDING` queue.
6. **Background Sync**: Once online, the payload is securely transmitted.
7. **Reactive Update**: The local status changes to `SYNCED`, and the UI reacts immediately.

## 💬 6. WhatsApp Workflow

1. **Farmer Discovery**: System recognizes the phone number and loads the farmer profile.
2. **Language Selection**: Bot communicates in the farmer's preferred language (e.g., Marathi).
3. **Gat Selection**: Bot lists the farmer's associated Gats (1, 2, 3...) for explicit selection.
4. **Crop & Media**: Farmer replies with the crop name and a photo.
5. **Backend Processing**: Standard validation pipeline is triggered transparently.
6. **WebBridge**: Bot provides a secure one-time link to view the rich validation result on the web.

---

## 📍 7. GPS + Gat Verification
Our system uses a dual-layer location verification strategy to prevent spoofing:

1. **Frontend GPS Pre-Gate (UX)**
   - Acts as an early warning system.
   - Prevents the user from submitting if they are visibly outside the polygon or if GPS accuracy is worse than 50 meters.
   - UI Indicators: 🟢 *Location Verified*, 🔴 *Outside Selected Field*, 🟠 *GPS Accuracy Too Low*.
   
2. **Authoritative Backend Validation (Security)**
   - The frontend is **never** trusted as the final security boundary.
   - The backend runs `Turf.js` to check whether the received coordinates fall within the farmer's authorized Gat polygon — a deterministic geometric test, not a trust score. It cannot detect a spoofed GPS chip, which is why borderline and AI-uncertain cases are routed to human review rather than auto-approved.

## 🤖 8. Gemini Vision AI
We utilize Google's **Gemini Vision AI** as a powerful crop verification layer.
- The AI analyzes the uploaded image and returns a `detectedCrop` and `confidence` score.
- The system compares the AI's detection against the farmer's `declaredCrop`.
- **Safe Failure Handling:** If Gemini fails, network errors occur, or confidence is too low, the system *never* blindly approves the crop. It securely degrades to a `REVIEW` status for manual administrative auditing.

## 📴 9. Offline-First Architecture & Synchronization
Designed for the field, the PWA relies on **Dexie (IndexedDB)**.
- Submissions made without internet are safely stored locally.
- The background `syncService` continuously monitors network status.
- When connectivity is restored, the queue is drained automatically.
- **Idempotency:** Every draft generates a stable `clientSubmissionId`. If a poor connection causes the client to retry a successful upload, the backend safely returns `HTTP 409 Duplicate`, and the frontend gracefully marks it `SYNCED` without creating duplicate database records.

## 🛡️ 10. Security Architecture
- **JWT Authentication:** Secures all backend web routes.
- **IDOR Protection:** Farmers can only submit data for Gats explicitly listed in their `associatedGats` array.
- **Backend Authority:** Location, crop matching, and authorization are evaluated exclusively on the server.
- **Secure WebBridge:** WhatsApp-to-Web transitions use single-use, verifiable tokens to prevent unauthorized viewing.

---

## 🏗️ 11. System Architecture Diagram

```mermaid
graph TD
    subgraph Client
        PWA[Web PWA] --> Dexie[(Local IndexedDB)]
        WA[WhatsApp]
    end

    Dexie -- Sync/Idempotent --> API
    WA -- Webhook --> API

    subgraph Backend Services
        API[Express API]
        Auth[JWT & Auth]
        Upload[Cloudinary]
    end

    subgraph Validation Engine
        Engine[Validation Controller]
        Geo[Turf.js GPS Check]
        AI[Gemini Vision AI]
    end

    API --> Auth
    API --> Upload
    API --> Engine
    
    Engine --> Geo
    Engine --> AI

    Engine --> DB[(MongoDB)]
```

---

## 💻 12. Technology Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- Dexie (IndexedDB)
- React Leaflet (Mapping)
- PWA / Service Workers

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT)
- Turf.js (Geospatial)
- Jest & Supertest (Testing)

**Cloud & Integrations:**
- Google Gemini Vision API
- Cloudinary (Media Storage)
- Twilio (WhatsApp API)

---

## 📁 13. Project Structure
*(Showing the primary active implementation folders)*

```text
Smart-E-Peek-Pahani/
├── frontend/                  # Active Web Frontend (PWA)
│   ├── src/
│   │   ├── components/        # Reusable UI elements
│   │   ├── pages/             # Route views (CropCapture, OfflineQueue)
│   │   ├── services/          # API & Background Sync logic
│   │   ├── storage/           # Dexie DB configuration
│   │   └── utils/             # GPS & Turf.js helpers
│   └── package.json
│
├── SKH/
│   └── backend/               # Active Node.js Backend
│       ├── src/
│       │   ├── controllers/   # Route handlers
│       │   ├── middleware/    # Auth & Error handling
│       │   ├── models/        # Mongoose schemas (Farmer, Gat, Submission, CalamityZone)
│       │   ├── routes/        # Express routers
│       │   └── services/      # Validation Engine, AI, WhatsApp Flow, Notifications, Relief Matching
│       ├── tests/             # Jest automated test suites
│       ├── scripts/           # Demo seeding scripts
│       └── server.js
│
└── README.md
```
*(Note: Older backup folders like `frontend-old/` or `Member2-SKH/` may exist in the repository history but are not part of the active compilation path).*

---

## 🧪 14. Demo Scenarios & Dataset
The database includes a test farmer equipped with **five independent demo Gats**, plus a demo revenue officer for the Officer Dashboard.

**Seed the demo dataset:**
```bash
cd SKH/backend
node scripts/seedDemoGats.js       # Demo farmer 1234567890 + Gats 101-105
node scripts/seedDemoOfficer.js    # Demo officer OFFICER001 / demo1234
node scripts/seedSchemeDeadline.js # Sample Kharif filing deadline, 5 days out
node scripts/seedCalamityZone.js   # Two sample calamity declarations (see scenario 9)
```

**Demo Coordinates:**
- **Gat 101:** `19.901255644, 74.493974593`
- **Gat 102:** `19.878711131, 74.480893507`
- **Gat 103:** `19.900353351, 74.494841635`
- **Gat 104:** `19.900640864, 74.494954287`
- **Gat 105:** `19.901061250, 74.494914653`

**Test these scenarios:**
1. **Perfect Pass:** Select Gat 101 + Spoof GPS to 101's coords + Upload Soybean → `VALID`.
2. **GPS Failure:** Select Gat 101 + Spoof GPS to 102's coords → UI blocks submission (`🔴 Outside Selected Field`).
3. **Crop Mismatch:** Select Gat 101 + GPS 101 + Upload random object → `INVALID` (AI rejection).
4. **Offline Mode:** Turn off network → Submit → View in Offline Queue → Turn network on → Watch it auto-sync.
5. **WhatsApp Multi-Gat:** Message the bot from the demo number → See 5 Gats offered → Select Gat 2 → Complete flow.
6. **Officer Review:** Run scenarios 1 and 3 so the database holds mixed outcomes → sign in at `/officer/login` as `OFFICER001` / `demo1234` → the dashboard lists submissions from *every* farmer and Gat, not just one account. Click the **Review** stat card to filter to flagged cases only, then switch to **Map** to see each submission plotted on its Gat polygon in its outcome colour (green `VALID` / amber `REVIEW` / red `INVALID`). Filter by `district=Nashik` or a date range to narrow further.
7. **Deadline Reminder:** With the sample deadline seeded and *no* submission filed for the demo farmer, run `node scripts/runAwarenessReminders.js`. The sweep reports one farmer with nothing on file and sends the reminder — printed to the console under `NOTIFICATION_PROVIDER=mock`, or delivered to WhatsApp when pointed at the Twilio sandbox. Run it a second time: the summary reports `skipped: 1`, because `NotificationLog` will not message the same farmer twice for the same reminder window. File a submission (scenario 1) and re-run to see the farmer drop out of the candidate list entirely.
8. **First-Contact Awareness:** Message the bot from a number that has never contacted it. Alongside the usual language menu, the number receives the one-time "what is E-Peek Pahani and why it matters" explanation. Message again — it is not repeated, and it stays un-repeated even after the 24-hour WhatsApp session expires, because the ledger lives in `NotificationLog` rather than the session.
9. **Calamity Relief Match:** File a soybean submission on Gat 101 (scenario 1) so a `VALID` record exists, then run `node scripts/seedCalamityZone.js` — the sample heavy-rainfall declaration covers Gats 101/103/104/105 and is declared *after* your filing, which is the real sequence. Now run `node scripts/runCalamityMatching.js`: the farmer receives a WhatsApp message naming the calamity, the Gat, the crop and the filing date, and the Officer Dashboard shows a violet **Relief eligible** badge on that row plus a *Relief* stat card you can click to filter. Run it again — `matchesCreated: 0`, `notificationsSent: 0`; nobody is messaged twice. Then file on **Gat 102** and re-match: it stays out, because Gat 102 sits outside the rainfall polygon and the hailstorm declaration that *does* cover it is scoped to `cotton` only. The script prints every near-miss with a reason (`GAT_OUTSIDE_ZONE`, `CROP_NOT_AFFECTED`, `FILED_AFTER_DECLARATION`) — a farmer left off a relief list deserves an explanation an officer can read out.

> Officer identity is seeded locally for the demo. A production deployment would federate against the state revenue-department directory, which requires a state MoU.
>
> Filing deadlines are seeded as clearly-labelled sample data. Real season windows would come from the Agriculture Department under the same MoU. Outbound WhatsApp defaults to a mock provider that prints instead of sending; the Twilio *sandbox* works with credentials, while a production WhatsApp Business sender needs Meta business verification and approved templates.
>
> Calamity zones are seeded the same way — clearly-labelled samples, not official declarations. In production they would arrive from the state's disaster-management declaration feed, again under a state MoU. A match means the filing should be **assessed** for relief; it is not an approved payout, and the decision stays with the revenue office.

---

## ⚙️ 15. Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB instance (Local or Atlas)
- Cloudinary Account
- Gemini API Key

### Backend Setup
```bash
cd SKH/backend
npm install

# Setup Environment Variables (Use .env.example as a template)
cp .env.example .env

# Start Development Server
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install

# Setup Environment Variables
cp .env.example .env

# Start Development Server
npm run dev
```

---

## 🔑 16. Environment Variables

**Backend (`SKH/backend/.env`)**
```env
PORT=5000
MONGODB_URI=your_mongo_connection_string
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=http://localhost:5173

# Gemini Vision
GEMINI_API_KEY=your_gemini_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Twilio WhatsApp (Optional for testing web-only)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Outbound notifications: 'mock' prints to the console, 'twilio' sends for real
NOTIFICATION_PROVIDER=mock
# Daily awareness sweep schedule (5-field cron), defaults to 08:00
AWARENESS_CRON=0 8 * * *

# Officer Dashboard demo seeding (optional, defaults to demo1234)
OFFICER_DEMO_PASSWORD=demo1234
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🩺 17. Automated Testing
The backend relies on a rigorous automated testing pipeline using Jest and Supertest. 

**Current Test Status:**
- **31 Test Suites Passed**
- **347 Tests Passed**
- **0 Failures**

Run tests locally:
```bash
cd SKH/backend
npm test
```

---

## 🚀 18. Future Scope
1. **Regional AI Models:** Fine-tuning Gemini models on localized, state-specific crop variants.
2. **Voice Surveying:** Completing the Marathi speech-to-text pipeline for fully hands-free farm surveying.

---

## 👥 19. Team
Built with ❤️ for the Smart e-Peek Pahani Hackathon.

---
<div align="center">
  <p><em>Empowering farmers with secure, reliable, and AI-driven agricultural tools.</em></p>
</div>
