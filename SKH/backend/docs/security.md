# Security Architecture and Limitations

## Prototype Architecture
For this hackathon prototype, certain security trade-offs are made for demonstration purposes:
- **WhatsApp Location Evidence:** WhatsApp location is collected and treated as location evidence, but we acknowledge it is not spoof-proof cryptographically verified location data.
- **EXIF Metadata:** Treated as supporting evidence, not a tamper-proof source of truth.
- **Frontend Validation:** Only for UX. The backend serves as the final authority and independently re-validates all submissions.
- **AI Crop Verification:** Treated as an evidence signal. AI confidence dictates `PASS`, `FAIL`, or `REVIEW`. It does not make the final eligibility decision directly.
- **Final Approval:** The prototype uses terms like `VALID` and `INVALID`. It does not use `APPROVED` or `REJECTED`, as government approval is outside the prototype scope.

## Backend Security Measures Implemented
- **Helmet:** Sets secure HTTP headers.
- **CORS:** Restricts API access to the designated frontend URL.
- **Rate Limiting:** Protects the API from brute-force and DDoS (100 requests per 15 minutes).
- **Duplicate Protection:** Enforced at the database level via a unique index on `clientSubmissionId`.
- **Environment Variables:** Secrets like `JWT_SECRET`, `TWILIO_AUTH_TOKEN`, and `GEMINI_API_KEY` are not hardcoded.
- **Error Handling:** Centralized error handler prevents leakage of stack traces or sensitive internal data.
- **Twilio Signature Validation:** A middleware interface is implemented to validate webhooks. (Mocked for local dev if token is 'mock_twilio_token').

## Production Roadmap
- Implement rigorous Twilio signature checks.
- Migrate critical captures to a controlled native mobile application capable of OS-level mock-location detection.
- Implement robust Authentication (e.g., OTP-based) for Farmers.
