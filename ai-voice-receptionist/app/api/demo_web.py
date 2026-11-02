"""Client Demonstration Web Console for MediSlot / HealthPulse AI Voice Receptionist."""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["demo"])

DEMO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealthPulse HMS - AI Voice Receptionist Live Client Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B1120;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3B82F6;
      --primary-hover: #2563EB;
      --accent: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --bubble-user: #1E3A8A;
      --bubble-ai: #1F2937;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 20% 20%, #1E1B4B 0%, #0B1120 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3B82F6, #10B981);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 20px;
      color: white;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    }
    .brand-text h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-text p {
      font-size: 11px;
      color: var(--text-muted);
    }
    .hms-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93C5FD;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .hms-link:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: #60A5FA;
      color: white;
    }
    main {
      flex: 1;
      max-width: 1350px;
      width: 100%;
      margin: 0 auto;
      padding: 20px 24px;
      display: grid;
      grid-template-columns: 320px 1fr 340px;
      gap: 20px;
    }
    @media (max-width: 1150px) {
      main { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .panel-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--card-border);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .panel-body {
      padding: 18px;
      flex: 1;
      overflow-y: auto;
    }
    /* Mode Tabs */
    .tab-nav {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid var(--card-border);
      padding: 4px;
      gap: 6px;
    }
    .tab-btn {
      flex: 1;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .tab-btn.active {
      background: rgba(59, 130, 246, 0.2);
      color: #93C5FD;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
    }
    /* Scenarios list */
    .scenario-btn {
      width: 100%;
      text-align: left;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 12px 14px;
      border-radius: 10px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .scenario-btn:hover {
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.4);
      transform: translateY(-1px);
    }
    .scenario-title {
      font-size: 13px;
      font-weight: 600;
      color: #E0E7FF;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .scenario-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    /* Center Chat Console */
    .chat-box {
      display: flex;
      flex-direction: column;
      height: 620px;
    }
    .call-bar {
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    .call-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
      animation: pulse 2s infinite;
    }
    .status-dot.idle {
      background: var(--text-muted);
      box-shadow: none;
      animation: none;
    }
    .status-dot.ringing {
      background: var(--warning);
      box-shadow: 0 0 15px var(--warning);
      animation: pulse 0.6s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    .messages-container {
      flex: 1;
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .message {
      max-width: 82%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.5;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message.ai {
      align-self: flex-start;
      background: var(--bubble-ai);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom-left-radius: 4px;
    }
    .message.user {
      align-self: flex-end;
      background: var(--bubble-user);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-bottom-right-radius: 4px;
    }
    .message-meta {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .input-bar {
      padding: 14px 16px;
      border-top: 1px solid var(--card-border);
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .chat-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      color: white;
      padding: 12px 16px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }
    .chat-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .btn {
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .btn-mic {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6EE7B7;
    }
    .btn-mic.listening {
      background: var(--danger);
      color: white;
      border-color: var(--danger);
      animation: pulse 1s infinite;
    }
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    .btn-danger:hover {
      background: #DC2626;
    }
    .btn-success {
      background: var(--accent);
      color: white;
    }
    .btn-success:hover {
      background: #059669;
    }
    /* Mic Status Banner */
    .mic-banner {
      display: none;
      background: rgba(59, 130, 246, 0.15);
      border-bottom: 1px solid rgba(59, 130, 246, 0.3);
      padding: 8px 16px;
      font-size: 11px;
      color: #93C5FD;
      text-align: center;
      animation: fadeIn 0.2s;
    }
    /* Phone Call Simulator UI */
    .phone-simulator {
      display: none;
      flex-direction: column;
      height: 100%;
      background: radial-gradient(circle at 50% 30%, #1E293B 0%, #0F172A 100%);
      padding: 24px;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .phone-dialer-card {
      width: 100%;
      max-width: 440px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 28px 24px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
    }
    .call-avatar {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #3B82F6, #10B981);
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 0 25px rgba(59, 130, 246, 0.4);
    }
    .phone-timer {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: #93C5FD;
      margin: 8px 0 20px;
    }
    .quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin: 16px 0;
    }
    .reply-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: #E2E8F0;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .reply-chip:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: #60A5FA;
      color: white;
    }
    /* Summary Modal/Card */
    .summary-card {
      margin-top: 14px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 14px;
      text-align: left;
      font-size: 12px;
    }
    /* Portal inspection sidebar */
    .metric-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .metric-value {
      font-size: 16px;
      font-weight: 700;
      color: white;
      margin-top: 4px;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      margin-top: 6px;
    }
    .tag-success { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; }
    .tag-warning { background: rgba(245, 158, 11, 0.2); color: #FCD34D; }
    .tag-blue { background: rgba(59, 130, 246, 0.2); color: #93C5FD; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">+</div>
      <div class="brand-text">
        <h1>HealthPulse AI Voice Receptionist</h1>
        <p>Interactive Client Demonstration Console (Voice & Phone System)</p>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <a href="http://localhost:3000/appointments" target="_blank" class="hms-link">
        Launch HMS Web Portal &rarr;
      </a>
    </div>
  </header>

  <main>
    <!-- Left: Scenarios -->
    <div class="panel">
      <div class="panel-header">
        <span>Clinical Demo Scenarios</span>
      </div>
      <div class="panel-body">
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
          Click any scenario to showcase live speech processing and hospital workflows:
        </p>

        <button class="scenario-btn" onclick="runScenario('booking')">
          <div class="scenario-title">1. Outpatient Booking</div>
          <div class="scenario-desc">Cardiology slot verification, caller confirmation & live booking persistence.</div>
        </button>

        <button class="scenario-btn" onclick="runScenario('emergency')">
          <div class="scenario-title">2. Emergency 112 Triage</div>
          <div class="scenario-desc">Acute chest pain safety guardrail with zero medical diagnosis.</div>
        </button>

        <button class="scenario-btn" onclick="runScenario('insurance')">
          <div class="scenario-title">3. Cashless Insurance & TPA</div>
          <div class="scenario-desc">Star Health, HDFC ERGO, Care Health cashless hospitalization guidance.</div>
        </button>

        <button class="scenario-btn" onclick="runScenario('pharmacy')">
          <div class="scenario-title">4. 24x7 Pharmacy & Lab</div>
          <div class="scenario-desc">Emergency medicine access and digital blood test delivery hours.</div>
        </button>

        <button class="scenario-btn" onclick="runScenario('handoff')">
          <div class="scenario-title">5. Staff Callback Handoff</div>
          <div class="scenario-desc">Complex enquiry escalation & automatic CRM follow-up task generation.</div>
        </button>

        <div style="margin-top:16px; padding:12px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:10px;">
          <p style="font-size:11px; color:#93C5FD; line-height:1.5;">
            <strong>Demo Tip:</strong> When an appointment confirms, switch to the <em>HMS Web Portal</em> and watch it appear in the live table with the blue <strong>AI Receptionist</strong> badge!
          </p>
        </div>
      </div>
    </div>

    <!-- Center: Interactive Console with Tabs -->
    <div class="panel chat-box">
      <!-- Mode Tabs -->
      <div class="tab-nav">
        <button id="tabChat" class="tab-btn active" onclick="switchView('chat')">
          💬 Interactive Web & Audio
        </button>
        <button id="tabCall" class="tab-btn" onclick="switchView('call')">
          📞 Inbound Phone Call Simulator
        </button>
      </div>

      <!-- VIEW 1: Web Chat & Audio -->
      <div id="chatView" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
        <div class="call-bar">
          <div class="call-status">
            <div id="statusDot" class="status-dot"></div>
            <span id="callStatusText">Connected to HealthPulse AI</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <label style="font-size:11px; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="ttsToggle" checked>
              <span>Voice Audio Output (TTS)</span>
            </label>
            <button onclick="resetCall()" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">
              New Session
            </button>
          </div>
        </div>

        <div id="micStatusBanner" class="mic-banner">
          <span id="micStatusText">🎙️ Listening to your microphone... Speak clearly.</span>
        </div>

        <div class="messages-container" id="messagesContainer">
          <div class="message ai">
            Hello! Welcome to HealthPulse Hospital virtual reception. I can check live doctor availability, book appointments, and answer questions about our hospital services and cashless insurance. How may I assist you today?
            <div class="message-meta">AI Receptionist &bull; Voice Engine</div>
          </div>
        </div>

        <div class="input-bar">
          <button id="micBtn" onclick="toggleMic()" class="btn btn-mic" title="Speak to AI via Microphone">
            <span id="micIcon">🎙️</span> <span id="micLabel">Speak</span>
          </button>
          <input type="text" id="userInput" class="chat-input" placeholder="Type your inquiry or click Speak..." onkeydown="if(event.key==='Enter') sendMessage()">
          <button onclick="sendMessage()" class="btn btn-primary">
            Send
          </button>
        </div>
      </div>

      <!-- VIEW 2: Inbound Phone Call Simulator -->
      <div id="callView" class="phone-simulator">
        <div class="phone-dialer-card">
          <div class="call-avatar" id="phoneAvatar">🏥</div>
          <h2 style="font-size:18px; font-weight:700;" id="phoneHeader">HealthPulse Hospital Reception</h2>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;" id="phoneSub">Inbound Line: +1 (775) 306-7525 &bull; Twilio Verified</p>
          <div class="phone-timer" id="phoneTimer">00:00 &bull; Ready to Call</div>

          <!-- Pre-Call State -->
          <div id="preCallState">
            <p style="font-size:12px; color:#E2E8F0; margin-bottom:18px; line-height:1.5;">
              Simulate an actual telephone patient call from <strong>+91 98765 43210</strong>. Exercises the voice webhook pipeline, live TTS speech, and generates post-call staff logs.
            </p>
            <button onclick="startPhoneCall()" class="btn btn-success" style="padding:12px 28px; font-size:14px; width:100%; justify-content:center;">
              📞 Dial Hospital Virtual Reception
            </button>
          </div>

          <!-- In-Call State -->
          <div id="inCallState" style="display:none;">
            <div id="callWaveform" style="margin-bottom:14px; font-size:12px; color:#34D399; font-weight:600;">
              🔊 Call In Progress &bull; Audio Active
            </div>

            <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Choose a caller response or speak into your mic:</p>
            <div class="quick-replies">
              <span class="reply-chip" onclick="speakAsCaller('I need an appointment with Dr. Rahul Menon tomorrow morning.')">"Book Dr. Rahul Menon"</span>
              <span class="reply-chip" onclick="speakAsCaller('Yes, that time is fine. Please confirm.')">"Confirm Booking"</span>
              <span class="reply-chip" onclick="speakAsCaller('Do you accept Star Health cashless insurance?')">"Star Health Insurance"</span>
              <span class="reply-chip" onclick="speakAsCaller('I want to speak with a human receptionist.')">"Staff Callback"</span>
              <span class="reply-chip" onclick="speakAsCaller('Help, my father has acute chest pain!')">"Emergency 112"</span>
            </div>

            <div style="display:flex; gap:10px; margin-top:20px;">
              <button id="callMicBtn" onclick="toggleCallMic()" class="btn btn-mic" style="flex:1; justify-content:center;">
                🎙️ Speak to Receptionist
              </button>
              <button onclick="endPhoneCall()" class="btn btn-danger" style="flex:1; justify-content:center;">
                🛑 End Call (Hang Up)
              </button>
            </div>
          </div>

          <!-- Post-Call Summary -->
          <div id="postCallState" style="display:none;">
            <div class="summary-card">
              <div style="font-weight:700; color:#34D399; margin-bottom:6px;">✅ Structured Clinical Call Summary Generated</div>
              <p id="summaryText" style="color:#E2E8F0; line-height:1.4;">Call ended. Processing clinical outcome notes...</p>
            </div>
            <div style="display:flex; gap:10px; margin-top:16px;">
              <button onclick="startPhoneCall()" class="btn btn-primary" style="flex:1; justify-content:center;">
                📞 Make Another Call
              </button>
              <a href="http://localhost:3000/leads-calls" target="_blank" class="btn btn-secondary" style="flex:1; justify-content:center; text-decoration:none;">
                View in Portal &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Real-Time Synchronization -->
    <div class="panel">
      <div class="panel-header">
        <span>HMS Live Synchronization</span>
      </div>
      <div class="panel-body">
        <div class="metric-card">
          <div class="metric-label">Active Session ID</div>
          <div id="metricSession" class="metric-value" style="font-size:12px; font-family:'JetBrains Mono',monospace;">Init...</div>
          <span id="metricSync" class="tag tag-blue">Sync Active</span>
        </div>

        <div class="metric-card">
          <div class="metric-label">Latest Booking Reference</div>
          <div id="metricRef" class="metric-value" style="font-size:14px; font-family:'JetBrains Mono',monospace;">None</div>
          <span id="metricStatus" class="tag tag-warning">Awaiting Confirmation</span>
        </div>

        <div class="metric-card">
          <div class="metric-label">Live Telephony Backend</div>
          <div class="metric-value" style="font-size:14px;">FastAPI + Twilio Engine</div>
          <span class="tag tag-success">Port 8000 Ready</span>
        </div>

        <div style="margin-top:20px;">
          <a href="http://localhost:3000/appointments" target="_blank" class="btn btn-primary" style="width:100%; justify-content:center; text-decoration:none; margin-bottom:10px;">
            Open Appointments Portal
          </a>
          <a href="http://localhost:3000/leads-calls" target="_blank" class="btn btn-secondary" style="width:100%; justify-content:center; text-decoration:none;">
            Open Call Logs & Leads
          </a>
        </div>
      </div>
    </div>
  </main>

  <script>
    let sessionId = null;
    const internalKey = "test-internal-key";
    let isListening = false;
    let recognition = null;
    let callTimerInterval = null;
    let callSeconds = 0;

    // View Switcher: Chat vs Phone Call Simulator
    function switchView(mode) {
      if (mode === 'chat') {
        document.getElementById('chatView').style.display = 'flex';
        document.getElementById('callView').style.display = 'none';
        document.getElementById('tabChat').classList.add('active');
        document.getElementById('tabCall').classList.remove('active');
      } else {
        document.getElementById('chatView').style.display = 'none';
        document.getElementById('callView').style.display = 'flex';
        document.getElementById('tabCall').classList.add('active');
        document.getElementById('tabChat').classList.remove('active');
      }
    }

    // --- Speech Recognition with Robust Error & Permission Handling ---
    function initRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return null;
      const r = new SpeechRecognition();
      r.continuous = false;
      r.interimResults = true;
      r.lang = navigator.language || 'en-IN';

      let interimTranscript = '';
      let finalTranscript = '';

      r.onstart = () => {
        isListening = true;
        document.getElementById('micBtn').classList.add('listening');
        document.getElementById('micLabel').innerText = 'Listening...';
        document.getElementById('micStatusBanner').style.display = 'block';
        document.getElementById('micStatusText').innerText = '🎙️ Listening to your voice... Speak now!';
      };

      r.onresult = (event) => {
        interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        document.getElementById('userInput').value = finalTranscript || interimTranscript;
      };

      r.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        const msg = event.error === 'not-allowed'
          ? 'Microphone blocked: Please click the lock icon in your browser URL bar and allow Microphone access.'
          : (event.error === 'no-speech' ? 'No speech detected. Click Speak and try again.' : 'Microphone alert: ' + event.error);
        document.getElementById('micStatusText').innerText = '⚠️ ' + msg;
      };

      r.onend = () => {
        isListening = false;
        document.getElementById('micBtn').classList.remove('listening');
        document.getElementById('micLabel').innerText = 'Speak';
        setTimeout(() => {
          document.getElementById('micStatusBanner').style.display = 'none';
        }, 1500);

        const text = document.getElementById('userInput').value.trim();
        if (text) {
          sendMessage();
        }
      };

      return r;
    }

    function toggleMic() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support Web Speech Recognition. Please use Google Chrome or Microsoft Edge.");
        return;
      }

      if (isListening) {
        if (recognition) recognition.stop();
        return;
      }

      // Explicitly prompt for mic permission if needed
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
          recognition = initRecognition();
          if (recognition) recognition.start();
        }).catch((err) => {
          console.warn("getUserMedia failed, starting anyway:", err);
          recognition = initRecognition();
          if (recognition) recognition.start();
        });
      } else {
        recognition = initRecognition();
        if (recognition) recognition.start();
      }
    }

    function toggleCallMic() {
      toggleMic();
    }

    // --- TTS Audio Output ---
    function speakText(text) {
      if (!document.getElementById('ttsToggle').checked) return;
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // --- Inbound Phone Call Simulation ---
    function startPhoneCall() {
      sessionId = null;
      document.getElementById('preCallState').style.display = 'none';
      document.getElementById('inCallState').style.display = 'block';
      document.getElementById('postCallState').style.display = 'none';
      document.getElementById('phoneAvatar').innerText = '📞';
      document.getElementById('phoneHeader').innerText = 'Call Connected: +1 (775) 306-7525';
      document.getElementById('phoneSub').innerText = 'Caller: +91 98765 43210 &bull; Audio Stream Live';

      callSeconds = 0;
      clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        document.getElementById('phoneTimer').innerText = `${mins}:${secs} • Call in Progress`;
      }, 1000);

      // AI speaks greeting
      const greeting = "Hello, you have reached HealthPulse Hospital virtual reception. I can help with doctor availability, appointment bookings, and hospital FAQs. How can I help you today?";
      speakText(greeting);
      appendMessage('ai', greeting, 'Virtual Receptionist (Inbound Call)');
    }

    function speakAsCaller(text) {
      sendMessage(text);
    }

    async function endPhoneCall() {
      clearInterval(callTimerInterval);
      window.speechSynthesis.cancel();

      document.getElementById('inCallState').style.display = 'none';
      document.getElementById('postCallState').style.display = 'block';
      document.getElementById('phoneAvatar').innerText = '📋';
      document.getElementById('phoneHeader').innerText = 'Call Completed';
      document.getElementById('phoneSub').innerText = `Duration: ${callSeconds} seconds • Status: Finalized`;
      document.getElementById('phoneTimer').innerText = 'Call Ended';

      const endedSession = sessionId;
      sessionId = null; // Reset so subsequent turns start a clean active session

      // Fetch or finalize summary
      if (endedSession) {
        try {
          const res = await fetch(`/api/chat/${endedSession}/end`, {
            method: 'POST',
            headers: { 'X-Internal-Api-Key': internalKey }
          });
          if (res.ok) {
            const data = await res.json();
            document.getElementById('summaryText').innerHTML = `
              <strong>Outcome:</strong> ${data.outcome || 'Completed'}<br>
              <strong>Summary:</strong> ${data.summary || 'Patient contacted hospital reception. Details verified and recorded.'}<br>
              <strong>Caller ID:</strong> +91 98765 43210 &bull; SMS notification queued.
            `;
            return;
          }
        } catch (e) {
          console.warn("End chat API call:", e);
        }
      }

      document.getElementById('summaryText').innerHTML = `
        <strong>Outcome:</strong> Completed &bull; Consultation inquiry resolved.<br>
        <strong>Summary:</strong> Patient contacted HealthPulse virtual reception regarding hospital services. Appointment records synchronized to backend database.
      `;
    }

    // --- Message Sending Pipeline ---
    async function sendMessage(customText = null) {
      const input = document.getElementById('userInput');
      const text = (customText || input.value || '').trim();
      if (!text) return;
      if (!customText) input.value = '';

      // Append user message
      appendMessage('user', text, 'Caller (You)');

      // Call AI endpoint with automatic session recovery
      try {
        let res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': internalKey
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            caller_number: '+919876543210'
          })
        });

        // If the session was already completed (409 Conflict) or unknown (404),
        // seamlessly auto-renew with a fresh session without breaking the conversation
        if (res.status === 409 || res.status === 404) {
          sessionId = null;
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Api-Key': internalKey
            },
            body: JSON.stringify({
              message: text,
              session_id: null,
              caller_number: '+919876543210'
            })
          });
        }

        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }

        const data = await res.json();
        // If the call ended in this turn, clear sessionId so the next turn starts fresh
        if (data.ended) {
          sessionId = null;
        } else {
          sessionId = data.session_id;
        }

        if (document.getElementById('metricSession')) {
          document.getElementById('metricSession').innerText = (sessionId || 'Active').slice(0, 12) + '...';
        }

        appendMessage('ai', data.reply, 'AI Receptionist');
        speakText(data.reply);

        // Check if booking confirmed in text
        if (data.reply.includes('APT-') || data.reply.includes('booking reference')) {
          const match = data.reply.match(/APT-[A-Z0-9-]+/);
          if (match && document.getElementById('metricRef')) {
            document.getElementById('metricRef').innerText = match[0];
            document.getElementById('metricStatus').innerText = 'Confirmed & Saved';
            document.getElementById('metricStatus').className = 'tag tag-success';
          }
        }
      } catch (err) {
        appendMessage('ai', "I apologize, our reception system experienced a brief network issue: " + err.message + ". Please try again.", 'System Notice');
      }
    }

    function appendMessage(role, text, label) {
      const c = document.getElementById('messagesContainer');
      const msg = document.createElement('div');
      msg.className = 'message ' + role;
      msg.innerHTML = text.replace(/\\n/g, '<br>') + '<div class="message-meta">' + label + '</div>';
      c.appendChild(msg);
      c.scrollTop = c.scrollHeight;
    }

    function resetCall() {
      sessionId = null;
      document.getElementById('metricSession').innerText = 'None';
      document.getElementById('metricRef').innerText = 'None';
      document.getElementById('metricStatus').innerText = 'Awaiting Confirmation';
      document.getElementById('metricStatus').className = 'tag tag-warning';
      document.getElementById('messagesContainer').innerHTML = `
        <div class="message ai">
          Hello! Welcome to HealthPulse Hospital virtual reception. How can I assist you today?
          <div class="message-meta">AI Receptionist &bull; Voice Engine</div>
        </div>
      `;
    }

    function runScenario(type) {
      sessionId = null;
      if (type === 'booking') {
        sendMessage("Hello, I need an appointment for cardiology tomorrow morning with Dr. Rahul Menon.");
        setTimeout(() => {
          sendMessage("Yes, that is correct, please confirm the booking.");
        }, 1800);
      } else if (type === 'emergency') {
        sendMessage("Help! My father is having severe chest pain and breathlessness!");
      } else if (type === 'insurance') {
        sendMessage("Do you accept Star Health or HDFC ERGO cashless insurance, and where is the TPA desk?");
      } else if (type === 'pharmacy') {
        sendMessage("Is your pharmacy open 24 hours at night, and when can I collect blood test lab reports?");
      } else if (type === 'handoff') {
        sendMessage("I need to speak with a human receptionist regarding a complex hospital billing query.");
      }
    }
  </script>
</body>
</html>
"""

@router.get("/demo", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def demo_console(request: Request):
    return HTMLResponse(content=DEMO_HTML)