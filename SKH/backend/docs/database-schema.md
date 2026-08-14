# Database Schema Contract

## MongoDB Collections

### Farmer
- `name` (String, required)
- `phoneNumber` (String, required, unique, indexed)
- `preferredLanguage` (String, enum: ['mr', 'hi', 'en'])
- `selectedGatId` (ObjectId, ref: 'Gat')
- `createdAt`, `updatedAt`

### Gat
- `gatNumber` (String, required, indexed)
- `village` (String, required)
- `district` (String, required)
- `cropTypes` (Array of String)
- `boundary` (GeoJSON Polygon, required, 2dsphere index)
- `center` (Object with `latitude` and `longitude`)
- `createdAt`, `updatedAt`

### Submission
- `clientSubmissionId` (String, required, unique, indexed)
- `farmerId` (ObjectId, ref: 'Farmer', required)
- `source` (String, enum: ['WEB', 'WHATSAPP'], required)
- `gatId` (ObjectId, ref: 'Gat', required)
- `crop` (Object with `declaredCrop`, `language`)
- `location` (Object with `latitude`, `longitude`, `source`, `receivedAt`, `accuracy`)
- `image` (Object with `url`, `mimeType`, `size`, `capturedAt`, `metadata`)
- `status` (String, enum: ['DRAFT', 'PENDING_VALIDATION', 'VALID', 'INVALID', 'REVIEW', 'SYNC_PENDING', 'SYNCED'])
- `validationResultId` (ObjectId, ref: 'ValidationResult')
- `createdAt`, `updatedAt`

### ValidationResult
- `submissionId` (ObjectId, ref: 'Submission', required, indexed)
- `overallStatus` (String, enum: ['PASS', 'FAIL', 'REVIEW'], required)
- `checks` (Object containing detailed validation results for identity, location, gat, image, crop, etc.)
- `reasons` (Array of String)
- `createdAt`, `updatedAt`

### WhatsAppSession
- `phoneNumber` (String, required, indexed)
- `state` (String)
- `language` (String)
- `farmerId` (ObjectId)
- `submissionId` (ObjectId)
- `expiresAt` (Date, TTL index)
- `createdAt`, `updatedAt`
