# WhatsApp Shipping Rate Automation Bot

## Project Overview
A WhatsApp-based freight rate inquiry system for **Vayani Shipping Line**. Customers send a message like "Karachi to Bangkok" and instantly receive the latest freight rates without contacting a human operator. Built using n8n Cloud, Groq AI, Google Sheets, and a custom WhatsApp bridge.

---

## Tech Stack

| Component | Tool | Purpose |
|---|---|---|
| WhatsApp Bridge | `whatsapp-bridge.js` (whatsapp-web.js) | Receives/sends WhatsApp messages |
| Workflow Engine | n8n Cloud | Orchestrates the entire flow |
| AI / NLP | Groq API (llama-3.1-8b-instant) | Extracts origin & destination from message |
| Rate Database | Google Sheets | Stores freight rates |
| Runtime | Node.js v24 | Runs the bridge on Windows |

---

## Architecture

```
Customer WhatsApp Message ("Karachi to Bangkok")
        ↓
whatsapp-bridge.js (running on PC, port 3000 for QR)
        ↓ HTTP POST
n8n Cloud Webhook
        ↓
Groq AI → extracts { origin: "karachi", destination: "bangkok" }
        ↓
Google Sheets → finds matching rate row
        ↓
Format reply message
        ↓
n8n responds with { replyMessage: "🚢 Vayani Shipping Line..." }
        ↓
whatsapp-bridge.js → msg.reply() → Customer receives reply
```

---

## File Structure

```
C:\watsapp_automation\
├── CLAUDE.md                          ← this file
├── whatsapp-bridge.js                 ← WhatsApp bridge (runs on PC)
├── whatsapp-session/                  ← WhatsApp login session (auto-created)
├── n8n-workflow.json                  ← import this into n8n Cloud
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
- Key placeholder in workflow: `YOUR_GROQ_API_KEY_HERE`
- Replace in n8n → Groq: Extract Route node → Authorization header

### Google Sheets
- Spreadsheet name: rate (user named)
- Spreadsheet ID: `19po22BzJMvRdOtoIdTfWqbrQnBDbLiQckMsjViXs7lc`
- Sheet tab name: `Base Rate`
- Range: `A1:J` (n8n reads from row 1; row 1 becomes column headers)
- Credential: Google Sheets OAuth2 (set up in n8n Cloud)

### n8n Cloud
- Account: talhajoiya.app.n8n.cloud
- Workflow ID: `nuTbrN3S2pXaGmW2`
- Test Webhook URL: `https://talhajoiya.app.n8n.cloud/webhook-test/whatsapp-shipping`
- Production Webhook URL: `https://talhajoiya.app.n8n.cloud/webhook/whatsapp-shipping`

### WhatsApp Bridge
- Bot WhatsApp number: 03191321129
- Session saved at: `C:\watsapp_automation\whatsapp-session\`
- Runs on: `http://localhost:3000` (QR code page during setup)

### Contact Details (shown in every bot reply)
- Phone: +92 300 1467979
- Email: rizwan@ilsmtc@gmail.com

### Evolution API (future use)
- API Key: in `.env` file → `EVOLUTION_API_KEY`
- Instance name: `shipping-bot`
- Runs on Docker: port 8080

---

## Google Sheets Column Structure

Sheet tab: `Base Rate` — n8n reads row 1 as column headers (actual header names below)

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

**Note:** n8n uses row 1 as column headers. Rows 2–6 contain company notes/empty rows. Actual rate data starts around row 7. The sheet has ~94 destinations, all from Karachi. No Middle East routes (Dubai, Jebel Ali) are currently in the sheet.

---

## n8n Workflow Nodes (11 nodes)

```
1. WhatsApp Webhook      → receives POST from bridge (responseMode: responseNode)
2. Valid Message?        → filters: event=messages.upsert AND fromMe=false
3. Extract Message       → extracts phone, name, messageText, instanceName
4. Groq: Extract Route   → calls Groq API to parse origin/destination
5. Parse AI Response     → parses JSON from Groq, merges with message data
6. Valid Shipping Query? → checks if origin AND destination are not null
7. Get All Rates         → reads Google Sheets Base Rate tab (99 rows)
8. Match and Format      → partial matches origin/destination, formats reply
9. Send Rate Reply       → Respond to Webhook with { replyMessage }
10. Format Help Message  → formats help text if not a shipping query
11. Send Help Reply      → Respond to Webhook with { replyMessage }
```

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
Invoke-RestMethod -Uri "https://talhajoiya.app.n8n.cloud/webhook/whatsapp-shipping" -Method POST -Body $body -ContentType "application/json"
```

---

## Sample Bot Response

Customer sends: `Karachi to Bangkok`

Bot replies:
```
🚢 *Vayani Shipping Line*
🗺️ Karachi → Bangkok, Thailand
━━━━━━━━━━━━━━━━━━━━

📦 *20ft Container:* $325 USD
📦 *40ft HC Container:* $300 USD

⚠️ *EBS:* $25/TEU additional
📋 *Included Surcharges:* AMS;BAF;CWC;CWX;EMC;FAF;FCR;LSA;LSS;PSS;SEC;THC

📅 *Effective:* 01-Jun-2026
✅ *Valid Until:* 30-Jun-2026

━━━━━━━━━━━━━━━━━━━━
For bookings & local charges, contact us:
📞 *+92 300 1467979*
📧 rizwan@ilsmtc@gmail.com
```

Customer sends: `Karachi to Dubai` (not in sheet)

Bot replies:
```
❌ *No rates found for this route.*
🗺️ KARACHI → DUBAI

This destination is not in our current rate list.

📋 *Available destinations from Karachi:*
Bangkok, Belawan, Busan, Cebu City, Chattogram... and 69 more

━━━━━━━━━━━━━━━━━━━━
For bookings & inquiries, contact us:
📞 *+92 300 1467979*
📧 rizwan@ilsmtc@gmail.com
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

Header/notes rows are filtered out before matching (rows where col B / destination is empty).

---

## Current Limitations

- Bot only works while PC is ON and `node whatsapp-bridge.js` is running
- Not 24/7 yet — needs Railway deployment for production
- Only Karachi origins in the sheet (all 94+ destinations are from Karachi)
- University WiFi blocks WhatsApp WebSocket connections — use home WiFi or hotspot

---

## Production Upgrade Plan (Future)

Deploy Evolution API to Railway.app for 24/7 operation:

```
Railway.app
├── Evolution API (v2.2.3)   ← replaces whatsapp-bridge.js
├── PostgreSQL               ← session storage
└── Redis                    ← cache

docker-compose.yml is already ready for Railway deployment.
```

Steps:
1. Create Railway account
2. New project → Deploy from GitHub or Docker Compose
3. Add environment variables from .env
4. Get Railway public URL
5. Update n8n "Send WhatsApp Reply" nodes with Railway URL
6. Scan QR code once in Evolution Manager
7. Bot runs 24/7

---

## Important Notes

- University WiFi blocks WhatsApp WebSocket connections — always use home WiFi or mobile hotspot
- ngrok is NOT needed with the bridge approach (bridge calls n8n, not the other way)
- EBS surcharge of $25/TEU is hardcoded in the reply (stated in the sheet header row)
- Rate data is valid until 30-Jun-2026 — update sheet when new rates arrive
- WhatsApp session is saved locally — no need to scan QR again unless session expires
- To add new routes (e.g. Dubai, Jebel Ali), simply add rows to the Google Sheet — the bot picks them up automatically
