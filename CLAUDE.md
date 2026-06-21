# WhatsApp Shipping Rate Automation Bot

## Project Overview
A WhatsApp-based freight rate inquiry system for **ILS International Logistics Services**. Customers send a message like "Karachi to Bangkok" and instantly receive the latest freight rates without contacting a human operator. Built using n8n (self-hosted on Railway), Groq AI, Google Sheets, and a custom WhatsApp bridge.

---

## Tech Stack

| Component | Tool | Purpose |
|---|---|---|
| WhatsApp Bridge | `whatsapp-bridge.js` (whatsapp-web.js) | Receives/sends WhatsApp messages |
| Workflow Engine | n8n (self-hosted on Railway) | Orchestrates the entire flow |
| AI / NLP | Groq API (llama-3.1-8b-instant) | Extracts origin & destination from message |
| Rate Database | Google Sheets | Stores freight rates |
| Runtime | Node.js v24 | Runs the bridge on Windows |
| Hosting | Railway.app | Hosts n8n 24/7 |

---

## Architecture

```
Customer WhatsApp Message ("Karachi to Bangkok")
        ↓
whatsapp-bridge.js (running on PC, port 3000 for QR)
        ↓ HTTP POST
n8n Railway Webhook
        ↓
Groq AI → extracts { origin: "karachi", destination: "bangkok" }
        ↓
Google Sheets → finds matching rate row
        ↓
Format reply message
        ↓
n8n responds with { replyMessage: "🌐 ILS International Logistics Services..." }
        ↓
whatsapp-bridge.js → sends ILS logo image with replyMessage as caption → Customer receives reply
```

---

## File Structure

```
C:\watsapp_automation\
├── CLAUDE.md                          ← this file
├── whatsapp-bridge.js                 ← WhatsApp bridge (runs on PC)
├── LOGOO 02.png                       ← ILS company logo (sent with every reply)
├── whatsapp-session/                  ← WhatsApp login session (auto-created)
├── n8n-workflow.json                  ← local reference copy of n8n workflow
├── docker-compose.yml                 ← Evolution API setup (future use)
├── .env                               ← Evolution API env vars (future use)
├── package.json                       ← Node.js dependencies
├── node_modules/                      ← installed packages
└── MD rate valid to 30Jun2026...xlsx  ← original Excel rate file
```

---

## Credentials & Keys

### Groq API
- Platform: console.groq.com
- Model: llama-3.1-8b-instant
- Key is hardcoded directly in the Authorization header of the "Groq: Extract Route1" HTTP Request node in n8n
- No separate n8n credential object needed

### Google Sheets
- Spreadsheet name: rate (user named)
- Spreadsheet ID: `19po22BzJMvRdOtoIdTfWqbrQnBDbLiQckMsjViXs7lc`
- Sheet tab name: `Base Rate`
- Range: **Detect Automatically** — do NOT set a manual range (e.g. A5:J); doing so causes n8n to treat the first data row as the header, breaking column key matching
- Credential: **Google Service Account** (NOT OAuth2)
  - Credential name in n8n: `Google Service Account account`
  - Service account email: `n8n-sheets-bot-823@first-scarab-499514-n9.iam.gserviceaccount.com`
  - Google Cloud project: `first-scarab-499514-n9`
  - Key file: `C:\Users\Anas Rizwan\Downloads\first-scarab-499514-n9-4928e30ace4e.json`
  - Google Sheets API enabled at: `console.cloud.google.com/apis/library/sheets.googleapis.com?project=first-scarab-499514-n9`
  - Sheet shared with service account email (Viewer role)
- Cleanup todo: An unused "Google Sheets account" OAuth2 credential exists in Railway n8n — safe to delete

### n8n Cloud (EXPIRED — migrated to Railway)
- Account: talhajoiya.app.n8n.cloud
- Workflow ID: `nuTbrN3S2pXaGmW2`
- Status: Trial expired June 15, 2026 — no longer in use

### n8n Railway (ACTIVE)
- URL: `https://n8n-production-aecf.up.railway.app`
- Login: `watcheseliteofficial@gmail.com` / `Admin1234!`
- Webhook URL: `https://n8n-production-aecf.up.railway.app/webhook/whatsapp-shipping`
- Project: whatsapp-shipping-bot
- Project ID: `4a36b5aa-a053-4b8f-a804-0e0bccd1e9b4`
- Service ID: `576ba0a8-0fe5-4a7a-843c-6adca11c13eb`
- Environment ID: `a8d2d3f9-f2f8-4893-8d56-1dc2f013990c`
- Docker image: `n8nio/n8n`

### Railway Account
- Email: watcheseliteofficial@gmail.com
- Workspace: Elite Watches's Projects

### WhatsApp Bridge
- Bot WhatsApp number: 03191321129
- Session saved at: `C:\watsapp_automation\whatsapp-session\`
- Runs on: `http://localhost:3000` (QR code page during setup)
- Logo file: `C:\watsapp_automation\LOGOO 02.png` (sent as image caption with every reply)
- Webhook URL in bridge: `https://n8n-production-aecf.up.railway.app/webhook/whatsapp-shipping`

### Contact Details (shown in every bot reply)
- Phone: +92 300 1467979
- Email: rizwan@ilsmtc.com

### Evolution API (future use)
- API Key: in `.env` file → `EVOLUTION_API_KEY`
- Instance name: `shipping-bot`
- Runs on Docker: port 8080

---

## Google Sheets Column Structure

Sheet tab: `Base Rate` — n8n reads from row 5 (skipping company header/notes rows)

| n8n Column Key | Description |
|---|---|
| `VAYANI SHIPPING LINE Karachi Locals` (col A) | Full origin e.g. "Keamari, Karachi, Sindh, Pakistan" |
| `col_2` (col B) | Full destination e.g. "Bangkok, Thailand" |
| `col_3` (col C) | Currency (USD) |
| `col_4` (col D) | Rate 20ft container |
| `col_5` (col E) | Rate 40ft HC container |
| `col_6` (col F) | Rate Effective Date |
| `col_7` (col G) | Rate Expiry Date |
| `col_8` (col H) | Included Surcharges (AMS;BAF;THC etc.) |
| `col_9` (col I) | Transshipment Ports |
| `col_10` (col J) | Service Loops |

**Note:** The sheet column header in col A is still `VAYANI SHIPPING LINE Karachi Locals` — this is the Google Sheets column key used for matching and must NOT be changed. The company name shown in bot replies is separately set to "ILS International Logistics Services" in the n8n code node. The sheet has ~94 destinations, all from Karachi.

---

## n8n Workflow Nodes (live on Railway)

```
1. WhatsApp Webhook1     → receives POST from bridge (responseMode: responseNode)
2. Valid Message?1       → filters: event=messages.upsert AND fromMe=false
3. Extract Message1      → extracts phone, name, messageText, instanceName
4. Groq: Extract Route1  → calls Groq API to parse origin/destination
5. Parse AI Response1    → parses JSON from Groq, merges with message data
6. Valid Shipping Query?1→ checks if origin AND destination are not null
7. Get All Rates1        → reads Google Sheets Base Rate tab (range: Detect Automatically)
8. Match and Format Reply1 → partial matches origin/destination, formats reply
9. Send Rate Reply       → Respond to Webhook with { replyMessage }
10. Format Help Message1 → formats help text if not a shipping query
11. Send Help Reply      → Respond to Webhook with { replyMessage }
```

**Key node — Match and Format Reply1:** Contains all message formatting logic including company name, rate display, EBS surcharge note, and contact details. Edit this node in n8n to change reply content. When no route matches, it builds a deduplicated, alphabetically sorted list of every destination city in the sheet (from `col_2`, taking the text before the first comma) and includes it in the reply along with contact details — both the matched and no-match branches now end with the same email/phone footer. The "hi"/help message (Format Help Message1) intentionally has no contact details.

---

## How to Run (Development)

### Start WhatsApp Bridge
```powershell
cd C:\watsapp_automation
node whatsapp-bridge.js
```
- First run: open `http://localhost:3000/qr` → scan QR with WhatsApp
- After scan: session saved, auto-reconnects on restart

### Test the Bot (without WhatsApp)
```powershell
$body = @{
  event = "messages.upsert"; instance = "shipping-bot"
  data = @{
    key = @{ remoteJid = "923001234567@s.whatsapp.net"; fromMe = $false; id = "TEST001" }
    pushName = "Test"; message = @{ conversation = "karachi to bangkok" }; messageType = "conversation"
  }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "https://n8n-production-aecf.up.railway.app/webhook/whatsapp-shipping" -Method POST -Body $body -ContentType "application/json"
```

---

## Sample Bot Response

Customer sends: `Karachi to Bangkok`

Bot replies (ILS logo image + caption):
```
🌐 *ILS International Logistics Services*
🗺️ KARACHI → BANGKOK
━━━━━━━━━━━━━━━━━━━━

📦 *20ft Container*
💵 $325 USD

📦 *40ft HC Container*
💵 $300 USD

⚠️ EBS: $25/TEU additional
✅ Valid Until: 30-Jun-2026

━━━━━━━━━━━━━━━━━━━━
For bookings & locals charges, contact our team.
📧 rizwan@ilsmtc.com
📞 +92 300 1467979
```

Customer sends: `Karachi to Dubai` (not in sheet)

Bot replies (ILS logo image + caption):
```
❌ *This route is not available*
🗺️ KARACHI → DUBAI
━━━━━━━━━━━━━━━━━━━━

Available destinations from Karachi:
Bangkok, Belawan, Busan, Cebu City, ... (full alphabetical list of every destination in the sheet)

━━━━━━━━━━━━━━━━━━━━
📧 rizwan@ilsmtc.com
📞 +92 300 1467979
```

---

## WhatsApp Bridge — How Replies Work

The bridge (`whatsapp-bridge.js`) sends every reply as a **single WhatsApp message**: the ILS logo image (`LOGOO 02.png`) with the rate text as the image caption. This means:
- Customer sees the ILS logo at the top
- Rate details appear as caption text below the logo
- Everything arrives as one combined message bubble

```javascript
// Core reply logic in whatsapp-bridge.js
const logo = MessageMedia.fromFilePath('./LOGOO 02.png');
await msg.reply(logo, undefined, { caption: response.replyMessage });
```

---

## AI Matching Logic

The Groq AI extracts city names from natural language:
- "Karachi to Bangkok" → `{ origin: "karachi", destination: "bangkok" }`
- "KHI to DXB" → `{ origin: "karachi", destination: "dubai" }`
- "Hello" → `{ origin: null, destination: null }` → sends help message

Google Sheets matching uses **partial match** (case-insensitive):
- `karachi` matches `Keamari, Karachi, Sindh, Pakistan` ✅
- `bangkok` matches `Bangkok, Thailand` ✅

---

## Current Status — FULLY DEPLOYED ✅

- ✅ n8n migrated from Cloud to Railway (self-hosted, runs 24/7)
- ✅ whatsapp-bridge.js updated to point to Railway webhook URL
- ✅ Workflow imported into Railway n8n
- ✅ Groq API key added (hardcoded in HTTP Request node header)
- ✅ Google Sheets connected via Service Account credential (Google Sheets API enabled, sheet shared with service account)
- ✅ "Get All Rates1" node set to Range: Detect Automatically (fixed "No rates found" bug)
- ✅ Workflow published/activated on Railway n8n
- ✅ whatsapp-bridge.js running and connected (WhatsApp session linked, no QR needed on restart)
- ✅ End-to-end tested: "karachi to bangkok" → full rate reply; "karachi to dubai" → no rates found; "hello" → help message
- ✅ Removed "(PVT)" from company name in all bot replies (2026-06-16)
- ✅ No-match reply now lists all available Karachi destinations + contact details; contact details appear on every reply except the help/"hi" message (2026-06-16)
- ✅ Company name in matched-route replies changed from "International Logistics Services" to "ILS International Logistics Services" (2026-06-16)
- ❌ PC still required for whatsapp-bridge.js to stay running 24/7 (see Production Upgrade Plan below)

---

## Monthly Running Cost

| Service | Cost |
|---|---|
| Railway (n8n self-hosted) | ~$5/month |
| Groq API | Free tier |
| Google Sheets | Free |
| **Total** | **~$5/month** |

---

## Production Upgrade Plan (Future)

Current setup requires the PC to stay on 24/7 for `whatsapp-bridge.js`. Two options were evaluated to remove this dependency:

**Option A — Evolution API on Railway (deferred):**
Self-hosted WhatsApp API requiring 3 extra Railway services (Evolution API + PostgreSQL + Redis), adding ~$13-18/month. `docker-compose.yml` and `.env` in this repo are pre-configured for this if revisited.

**Option B — Twilio WhatsApp Business API (current plan):**
Official WhatsApp Business API, no self-hosted server or PC dependency, pay-per-message (~$0.005/message). Decided as the preferred next step over Evolution API due to lower cost and no infra to maintain. Not yet implemented — would replace `whatsapp-bridge.js` with direct Twilio webhook integration into the existing n8n workflow.

Migration steps when ready:
1. Create Twilio account + apply for WhatsApp Business API sender (Meta approval, 1–3 days)
2. Point Twilio WhatsApp webhook → existing Railway n8n webhook URL
3. Update n8n: adjust webhook input parsing (Twilio sends `Body`, `From` fields vs current format) and replace "Send Rate Reply" node with a Twilio REST API call
4. Decommission `whatsapp-bridge.js`

**Decision:** Keep the current PC + whatsapp-bridge.js setup for now; revisit Twilio migration when PC-dependency becomes a real problem.

---

## Client Pricing Guide (Karachi Local Market)

For selling this bot to a local Karachi freight/logistics business:

**One-Time Setup Fee:** PKR 25,000 – 50,000 (~$90–$180)
- Covers: building, deploying, testing, and handover

**Monthly Maintenance Fee:** PKR 5,000 – 10,000/month (~$18–$36)
- Covers: keeping everything running, rate sheet updates, fixing issues

**Recommended pricing:** PKR 35,000 setup + PKR 7,000/month with a 3-month minimum contract

**Monthly profit margin at PKR 7,000/month:**
- You charge: PKR 7,000
- Your actual cost: ~PKR 1,400–2,500 ($5–$9)
- Your profit: ~PKR 4,500–5,600/month

**Pitch to client:** "Instead of paying a staff member to answer the same rate questions all day, this bot handles it automatically 24/7 — for less than PKR 10,000/month."

---

## Maintenance Tasks (What You Actually Do)

| Task | Effort | Frequency | Notes |
|---|---|---|---|
| Rate sheet updates | 5–10 min | Every 1–3 months | Client gets new freight rates — update Google Sheet |
| WhatsApp bridge restart | 2–3 min | Every few weeks | Goes away after Twilio migration |
| Railway/n8n health check | 2 min | Monthly | Just open Railway dashboard |
| WhatsApp session expiry (QR re-scan) | 5 min | Rarely | Also goes away after Twilio migration |

**Reality check:** Before Twilio — maybe 2–3 bridge restarts/month, 5 minutes each. After Twilio — maintenance drops to almost zero, just rate sheet updates. Total actual work is rarely more than 30 minutes/month.

---

## Important Notes

- University WiFi blocks WhatsApp WebSocket connections — always use home WiFi or mobile hotspot
- ngrok is NOT needed with the bridge approach (bridge calls n8n, not the other way)
- EBS surcharge of $25/TEU is hardcoded in the reply (stated in the sheet header row)
- Rate data is valid until 30-Jun-2026 — update sheet when new rates arrive
- WhatsApp session is saved locally — no need to scan QR again unless session expires
- To add new routes, simply add rows to the Google Sheet — the bot picks them up automatically
- The Google Sheets column key `VAYANI SHIPPING LINE Karachi Locals` is the actual spreadsheet header — do NOT rename it even though the company name in replies is now ILS
- Chrome DevTools MCP is used to update live n8n nodes — reconnect by restarting Claude Code
- If Google Sheets ever returns a 403 "Forbidden" error again, check two things: (1) the sheet is still shared with `n8n-sheets-bot-823@first-scarab-499514-n9.iam.gserviceaccount.com`, and (2) the Sheets API is still enabled for project `first-scarab-499514-n9`
- If "No rates found" appears for a route that's actually in the sheet, check that "Get All Rates1" Range Definition is set to "Detect Automatically" — a manually specified range breaks the column key matching
- n8n's Code node editor (CodeMirror) search/replace box auto-converts `\n` typed into the Find/Replace fields into a real newline character, even outside regex mode. To search/replace a literal `\n` escape sequence as it appears in JS source (backslash + n), type a doubled backslash (`\\n`) in the box — otherwise "0 matches" is reported even though the text is visibly present.
- The n8n Railway session expires fairly quickly while editing a workflow (autosave can fail with "Unauthorized" mid-edit). If that happens, do NOT reload the tab — the unsaved-changes dialog auto-accepts on reload and wipes the in-memory edit. Instead log in again in a separate browser tab (refreshes the shared session cookie) and return to the original tab; the in-progress edit and the editor's Publish button state survive.

---

## Troubleshooting "Bot not replying"

When a customer reports no reply, isolate which half of the pipeline is broken before assuming Railway is at fault:

1. **Test n8n/Railway directly** (bypasses the bridge and WhatsApp entirely) using the PowerShell snippet in "Test the Bot" above. If it returns a `replyMessage`, Railway/Groq/Google Sheets are all fine — the problem is in the bridge or WhatsApp itself, not Railway.
2. **Check the bridge:** `Invoke-RestMethod http://localhost:3000/status` — but note this can report `"connected"` even when the bridge has silently stopped processing real messages. `/status` only reflects whether `client.info` exists, not whether the WhatsApp Web session is actively receiving events.
3. **If in doubt, just restart the bridge** — it's the cheapest fix and safe to do anytime:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
   Stop-Process -Id <pid> -Force
   Set-Location C:\watsapp_automation; node whatsapp-bridge.js
   ```
   The saved session in `whatsapp-session/` means no QR re-scan is needed. After restart, watch the console — real incoming messages log as `📩 Message from ...` followed by `✉️  Reply sent to ...`.
- Confirmed 2026-06-15: a "not working" report turned out to be the bridge needing a restart, not a Railway/n8n issue — the direct webhook test succeeded the whole time.
