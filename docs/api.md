# API Reference — Cloudflare Worker Proxy

This project uses a Cloudflare Worker as a secure middleware between the React frontend and external services (Google Gemini, Supabase, and Third-Party Scrapers).

## 🔐 Security & Authentication
All `/api/` endpoints (except the WhatsApp webhook) require a valid **Supabase JWT** in the `Authorization` header:
`Authorization: Bearer <USER_JWT>`

The worker verifies the token via the Supabase `/auth/v1/user` endpoint before processing requests.

---

## 📡 Endpoints

### 1. Gemini AI Proxy
`POST /api/gemini`
Proxies requests to the Gemini 1.5 Flash model.
- **Request Body**: Standard Gemini API payload.
- **Rate Limit**: 30 requests per minute per user.
- **Purpose**: General AI chat, client analysis, and text generation.

### 2. 3D Model Scraper
`POST /api/scrape-3d`
Extracts technical data from 3D design platforms.
- **Request Body**: `{ "url": "https://..." }`
- **Supported Platforms**: MakerWorld, BambuLab, and generic OpenGraph sites.
- **Returns**: Name, material, layer height, infill, estimated time, and grams.

### 3. Sublimation Design Scraper
`POST /api/scrape-sublimation`
Extracts metadata from design marketplaces.
- **Request Body**: `{ "url": "https://..." }`
- **Supported Platforms**: Creative Fabrica, Etsy, Design Bundles, etc.
- **Returns**: Design name, image, description, designer, and price.

### 4. AI Design Tools
`POST /api/design-tools`
Performs advanced image manipulation using Gemini's image-to-image capabilities.
- **Request Body**:
  - `action`: `"remove_bg"` or `"mockup"`.
  - `imageUrl` or `imageBase64`: Source image.
  - `product` (Optional): Required for `"mockup"` (e.g., "white ceramic mug").
- **Returns**: Base64 encoded result and mimeType.
- **Logic**: Resolves remote images to base64 before sending them to Google AI.

### 5. WhatsApp Webhook
`GET / api/whatsapp/webhook`
Handles Meta's webhook verification.
- **Params**: `hub.mode`, `hub.verify_token`, `hub.challenge`.

`POST /api/whatsapp/webhook`
Receives inbound messages.
- **Logic**: 
  1. Identifies the `company_id` via the sender's phone number.
  2. Finds or creates the `customer` record.
  3. Logs the interaction in `customer_interactions`.

---

## ⏱ Rate Limiting
The worker implements a custom `rateLimit` utility that tracks requests per user token. If exceeded, it returns:
- **Status**: `429 Too Many Requests`
- **Body**: `{ "error": "Demasiadas solicitudes seguidas..." }`
