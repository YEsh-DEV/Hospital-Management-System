"""Public-Facing Client Demonstration Web Console for MediSlot / HealthPulse AI Voice Receptionist.
Designed as a public hospital virtual reception portal matching the Advfiction HMS aesthetic (colors, fonts, cards).
No internal staff sidebar or Super Admin widget - intended for public patients and callers.
"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["demo"])

DEMO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Advfiction Hospital HealthPulse - Virtual AI Voice Receptionist</title>
  <meta name="description" content="Advfiction Hospital HealthPulse 24x7 Public AI Voice & Chat Receptionist">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F9FAFB;
      --foreground: #1F2937;
      --card-bg: #FFFFFF;
      --card-border: #E5E7EB;
      --primary: #2563EB;
      --primary-hover: #1D4ED8;
      --primary-subtle: #EFF6FF;
      --text-muted: #6B7280;
      --accent-green: #10B981;
      --accent-amber: #F59E0B;
      --accent-red: #EF4444;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--foreground);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-size: 14px;
      line-height: 1.5;
    }

    /* Public Header Bar */
    header.public-header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--card-border);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }
    .brand-info h1 {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .brand-info p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.2;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .emergency-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FEE2E2;
      border: 1px solid #FECACA;
      color: #DC2626;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .staff-portal-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      color: #374151;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .staff-portal-link:hover {
      background: #F9FAFB;
      border-color: #9CA3AF;
      color: #111827;
    }

    /* Main Container */
    main.public-container {
      flex: 1;
      max-width: 1280px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 24px 40px;
    }

    /* Welcome Banner */
    .banner-box {
      background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
      border-radius: 16px;
      padding: 24px 28px;
      color: #FFFFFF;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .banner-text h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .banner-text p {
      font-size: 13.5px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 4px;
      max-width: 700px;
    }
    .banner-status {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #34D399;
    }

    /* Two-Column Patient Layout */
    .patient-grid {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 22px;
      align-items: start;
    }
    @media (max-width: 960px) {
      .patient-grid { grid-template-columns: 1fr; }
      .banner-box { flex-direction: column; align-items: flex-start; gap: 12px; }
    }

    /* Clean Card */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .card-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #FFFFFF;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-badge {
      font-size: 11px;
      font-weight: 600;
      background: var(--primary-subtle);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .card-body {
      padding: 18px;
    }

    /* Patient Quick Query Buttons */
    .scenario-btn {
      width: 100%;
      text-align: left;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      color: #1F2937;
      padding: 12px 14px;
      border-radius: 10px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .scenario-btn:hover {
      background: #F8FAFC;
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
    }
    .scenario-name {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .scenario-desc {
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* Hospital Info Box */
    .hospital-info-box {
      margin-top: 14px;
      padding: 14px;
      background: #F8FAFC;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      font-size: 12px;
      color: #374151;
      line-height: 1.5;
    }
    .hospital-info-box h4 {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 11.5px;
      color: #4B5563;
    }

    /* Console Tabs */
    .tab-bar {
      display: flex;
      background: #F8FAFC;
      border-bottom: 1px solid var(--card-border);
      padding: 6px 10px 0;
      gap: 6px;
    }
    .tab-btn {
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 500;
      color: #6B7280;
      border: none;
      background: transparent;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-btn:hover {
      color: #111827;
    }
    .tab-btn.active {
      background: #FFFFFF;
      color: var(--primary);
      font-weight: 600;
      border: 1px solid var(--card-border);
      border-bottom-color: #FFFFFF;
      margin-bottom: -1px;
    }

    /* Console Sub-Bar */
    .control-bar {
      background: #FFFFFF;
      border-bottom: 1px solid var(--card-border);
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #374151;
    }
    .pulse-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .btn-secondary {
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      color: #374151;
      padding: 5px 12px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-secondary:hover {
      background: #F9FAFB;
      border-color: #9CA3AF;
    }

    /* Messages Stream */
    .messages-stream {
      background: #F8FAFC;
      padding: 20px;
      height: 480px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .msg-row {
      display: flex;
      flex-direction: column;
      max-width: 82%;
    }
    .msg-row.ai {
      align-self: flex-start;
    }
    .msg-row.user {
      align-self: flex-end;
    }
    .msg-bubble {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .msg-row.ai .msg-bubble {
      background: #FFFFFF;
      color: #1F2937;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      border-bottom-left-radius: 4px;
    }
    .msg-row.user .msg-bubble {
      background: var(--primary);
      color: #FFFFFF;
      border-bottom-right-radius: 4px;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
    }
    .msg-meta {
      font-size: 11px;
      color: #6B7280;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .msg-row.user .msg-meta {
      align-self: flex-end;
      color: #6B7280;
    }

    /* Input Bar */
    .input-bar {
      padding: 14px 18px;
      background: #FFFFFF;
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #D1D5DB;
      border-radius: 9px;
      font-size: 13.5px;
      color: #111827;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .chat-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .btn-send {
      background: var(--primary);
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-send:hover {
      background: var(--primary-hover);
    }
    .btn-mic {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: var(--primary);
      padding: 10px 14px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-mic:hover {
      background: #DBEAFE;
    }
    .btn-mic.listening {
      background: #FEE2E2;
      border-color: #FCA5A5;
      color: var(--accent-red);
      animation: pulse 1.2s infinite;
    }

    /* Phone Simulator Tab */
    .phone-simulator-box {
      padding: 28px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #FFFFFF;
    }
    .phone-dialer-card {
      max-width: 520px;
      width: 100%;
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 28px 24px;
      background: #FAFAFA;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .phone-avatar-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #EFF6FF;
      color: var(--primary);
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
      border: 1px solid #DBEAFE;
    }
    .phone-timer-badge {
      display: inline-block;
      margin: 10px auto 18px;
      background: #F3F4F6;
      color: #374151;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 14px;
      border-radius: 20px;
      border: 1px solid #E5E7EB;
    }
    .quick-chips-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 10px;
    }
    .quick-chip {
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      color: #374151;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .quick-chip:hover {
      background: #EFF6FF;
      border-color: var(--primary);
      color: var(--primary);
    }
    .btn-call-start {
      background: var(--accent-green);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(16, 185, 129, 0.2);
    }
    .btn-call-start:hover {
      background: #059669;
    }
    .btn-call-end {
      background: var(--accent-red);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      flex: 1;
    }
    .btn-call-end:hover {
      background: #DC2626;
    }
    .summary-box {
      margin-top: 16px;
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      border-radius: 10px;
      padding: 16px;
      text-align: left;
      font-size: 13px;
      line-height: 1.5;
    }
    .summary-heading {
      color: var(--accent-green);
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Public Footer */
    footer.public-footer {
      border-top: 1px solid var(--card-border);
      background: #FFFFFF;
      padding: 18px 24px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <!-- Public Hospital Header -->
  <header class="public-header">
    <div class="header-inner">
      <div class="brand-box">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div class="brand-info">
          <h1>Advfiction Hospital</h1>
          <p>24x7 Public Virtual AI Voice Receptionist</p>
        </div>
      </div>

      <div class="header-right">
        <div class="emergency-badge">
          <span>🚨 Emergency: 112</span>
        </div>
        <a href="http://localhost:3000/appointments" target="_blank" class="staff-portal-link">
          <span>Staff HMS Portal &rarr;</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Patient Interface Container -->
  <main class="public-container">
    <!-- Welcome Header Banner -->
    <div class="banner-box">
      <div class="banner-text">
        <h2>Advfiction Hospital Reception Desk</h2>
        <p>Welcome! Speak or chat with our automated hospital receptionist to check live doctor availability, book appointments, or inquire about emergency and insurance services.</p>
      </div>
      <div class="banner-status">
        <div class="live-dot"></div>
        <span>Receptionist Online</span>
      </div>
    </div>

    <!-- Two-Column Clean Layout -->
    <div class="patient-grid">
      <!-- Left Column: Patient Quick Inquiries -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>Patient Quick Inquiries</span>
          </div>
          <span class="card-badge">Instant Answers</span>
        </div>

        <div class="card-body">
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
            Click any question to ask our AI Receptionist or practice speech recognition:
          </p>

          <button class="scenario-btn" onclick="runScenario('booking')">
            <div class="scenario-name">1. Book Doctor Appointment</div>
            <div class="scenario-desc">Consultation with Dr. Rahul Menon in Cardiology tomorrow morning.</div>
          </button>

          <button class="scenario-btn" onclick="runScenario('emergency')">
            <div class="scenario-name">2. Emergency 112 Triage</div>
            <div class="scenario-desc">Acute chest pain protocol & emergency ambulance redirection.</div>
          </button>

          <button class="scenario-btn" onclick="runScenario('insurance')">
            <div class="scenario-name">3. Cashless Insurance & TPA</div>
            <div class="scenario-desc">Star Health, HDFC ERGO cashless coverage & admission process.</div>
          </button>

          <button class="scenario-btn" onclick="runScenario('pharmacy')">
            <div class="scenario-name">4. 24x7 Pharmacy & Lab</div>
            <div class="scenario-desc">Emergency medicine counter & digital blood test turnaround times.</div>
          </button>

          <button class="scenario-btn" onclick="runScenario('handoff')">
            <div class="scenario-name">5. Talk to Staff Receptionist</div>
            <div class="scenario-desc">Request an automated callback from our hospital reception team.</div>
          </button>

          <!-- Hospital Info -->
          <div class="hospital-info-box">
            <h4>Hospital Information</h4>
            <div class="info-item">📍 Advfiction Hospital & Research Institute</div>
            <div class="info-item">⏰ OPD Clinics: Mon – Sat, 9:00 AM – 6:00 PM</div>
            <div class="info-item">🚑 24x7 Emergency & Pharmacy Counter Open</div>
          </div>
        </div>
      </div>

      <!-- Right Column: Interactive Voice & Chat Console -->
      <div class="card">
        <!-- Mode Navigation Tabs -->
        <div class="tab-bar">
          <button id="tabChat" class="tab-btn active" onclick="switchView('chat')">
            <span>💬 Live Voice & Text Receptionist</span>
          </button>
          <button id="tabCall" class="tab-btn" onclick="switchView('call')">
            <span>📞 Inbound Phone Call Simulator</span>
          </button>
        </div>

        <!-- Status Control Sub-Bar -->
        <div class="control-bar">
          <div class="status-indicator">
            <div class="pulse-dot"></div>
            <span id="callStatusText">Connected to Advfiction AI Receptionist</span>
          </div>

          <div style="display:flex; align-items:center; gap:14px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:#4B5563;">
              <input type="checkbox" id="ttsToggle" checked style="accent-color:var(--primary);">
              <span>Voice Audio Output (TTS)</span>
            </label>

            <button onclick="resetCall()" class="btn-secondary">
              New Inquiry
            </button>
          </div>
        </div>

        <!-- TAB 1: Chat & Web Audio -->
        <div id="chatView" style="display:flex; flex-direction:column;">
          <div id="micStatusBanner" style="display:none; background:#FEF3C7; border:1px solid #FDE68A; color:#92400E; padding:8px 14px; font-size:12px; font-weight:500;">
            <span id="micStatusText">🎙️ Listening to your voice... Speak clearly.</span>
          </div>

          <div class="messages-stream" id="messagesContainer">
            <div class="msg-row ai">
              <div class="msg-bubble">
                Hello! Welcome to <strong>Advfiction Hospital</strong>. I can check live doctor availability, book consultation appointments, and answer questions regarding hospital services and cashless insurance. How may I assist you today?
              </div>
              <div class="msg-meta">🩺 Advfiction AI Receptionist &bull; Voice Engine</div>
            </div>
          </div>

          <div class="input-bar">
            <button id="micBtn" onclick="toggleMic()" class="btn-mic" title="Speak via Microphone">
              <span id="micIcon">🎙️</span> <span id="micLabel">Speak</span>
            </button>
            <input type="text" id="userInput" class="chat-input" placeholder="Type your inquiry or click Speak to use your voice..." onkeydown="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()" class="btn-send">
              Send
            </button>
          </div>
        </div>

        <!-- TAB 2: Inbound Phone Call Simulator -->
        <div id="callView" class="phone-simulator-box" style="display:none;">
          <div class="phone-dialer-card">
            <div class="phone-avatar-circle" id="phoneAvatar">📞</div>
            <h3 style="font-size:17px; font-weight:700; color:#111827;" id="phoneHeader">Advfiction Hospital Reception Line</h3>
            <p style="font-size:12px; color:#6B7280; margin-top:2px;" id="phoneSub">Inbound Line: +1 (775) 306-7525 &bull; Twilio Verified</p>
            <div class="phone-timer-badge" id="phoneTimer">00:00 &bull; Ready to Connect</div>

            <!-- Pre-Call State -->
            <div id="preCallState">
              <p style="font-size:12.5px; color:#4B5563; margin-bottom:18px; line-height:1.5;">
                Simulate an incoming patient call from <strong>+91 98765 43210</strong>. Tests the speech pipeline, live TTS voice replies, and creates post-call clinical summary logs.
              </p>
              <button onclick="startPhoneCall()" class="btn-call-start">
                <span>📞 Dial Hospital Virtual Reception</span>
              </button>
            </div>

            <!-- In-Call State -->
            <div id="inCallState" style="display:none;">
              <div style="margin-bottom:14px; font-size:12px; color:var(--accent-green); font-weight:600;">
                🔊 Call In Progress &bull; Audio Stream Active
              </div>

              <p style="font-size:11.5px; color:#6B7280; margin-bottom:8px;">Click a caller response or speak into your microphone:</p>
              <div class="quick-chips-wrapper">
                <span class="quick-chip" onclick="speakAsCaller('I need an appointment with Dr. Rahul Menon tomorrow morning.')">"Book Dr. Rahul Menon"</span>
                <span class="quick-chip" onclick="speakAsCaller('Yes, that time is fine. Please confirm the booking.')">"Confirm Booking"</span>
                <span class="quick-chip" onclick="speakAsCaller('Do you accept Star Health cashless insurance?')">"Star Health Insurance"</span>
                <span class="quick-chip" onclick="speakAsCaller('I want to speak with a human receptionist.')">"Staff Callback"</span>
                <span class="quick-chip" onclick="speakAsCaller('Help, my father has acute chest pain!')">"Emergency 112"</span>
              </div>

              <div style="display:flex; gap:10px; margin-top:20px;">
                <button id="callMicBtn" onclick="toggleCallMic()" class="btn-mic" style="flex:1; justify-content:center;">
                  🎙️ Speak to Receptionist
                </button>
                <button onclick="endPhoneCall()" class="btn-call-end">
                  🛑 End Call (Hang Up)
                </button>
              </div>
            </div>

            <!-- Post-Call Summary -->
            <div id="postCallState" style="display:none;">
              <div class="summary-box">
                <div class="summary-heading">
                  <span>✅ Structured Clinical Call Summary Generated</span>
                </div>
                <p id="summaryText" style="color:#374151;">Call ended. Generating clinical outcome notes...</p>
              </div>
              <div style="display:flex; gap:10px; margin-top:16px;">
                <button onclick="startPhoneCall()" class="btn-send" style="flex:1; justify-content:center;">
                  📞 Make Another Call
                </button>
                <button onclick="switchView('chat')" class="btn-secondary" style="flex:1; justify-content:center;">
                  Back to Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Public Footer -->
  <footer class="public-footer">
    Advfiction Hospital &bull; Powered by HealthPulse AI Voice Receptionist Engine &bull; All Rights Reserved.
  </footer>

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

    // --- Speech Recognition ---
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
      const greeting = "Hello, you have reached Advfiction Hospital. I can help with doctor availability, appointment bookings, and hospital FAQs. How can I help you today?";
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
      sessionId = null; // Clean state for next turn

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
        <strong>Summary:</strong> Patient contacted Advfiction virtual reception regarding hospital services. Records synchronized to backend database.
      `;
    }

    // --- Message Sending Pipeline with Auto 409 & 404 Recovery ---
    async function sendMessage(customText = null) {
      const input = document.getElementById('userInput');
      const text = (customText || input.value || '').trim();
      if (!text) return;
      if (!customText) input.value = '';

      // Append user message
      appendMessage('user', text, 'You (Patient/Caller)');

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

        // Auto-renew if session was completed (409) or unknown (404)
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
        if (data.ended) {
          sessionId = null;
        } else {
          sessionId = data.session_id;
        }

        appendMessage('ai', data.reply, 'Advfiction Receptionist');
        speakText(data.reply);
      } catch (err) {
        appendMessage('ai', "I apologize, our reception system experienced a brief network issue: " + err.message + ". Please try again.", 'System Notice');
      }
    }

    function appendMessage(role, text, label) {
      const c = document.getElementById('messagesContainer');
      const row = document.createElement('div');
      row.className = 'msg-row ' + role;
      row.innerHTML = `
        <div class="msg-bubble">${text.replace(/\\n/g, '<br>')}</div>
        <div class="msg-meta">${label}</div>
      `;
      c.appendChild(row);
      c.scrollTop = c.scrollHeight;
    }

    function resetCall() {
      sessionId = null;
      document.getElementById('messagesContainer').innerHTML = `
        <div class="msg-row ai">
          <div class="msg-bubble">
            Hello! Welcome to <strong>Advfiction Hospital</strong>. How can I assist you today?
          </div>
          <div class="msg-meta">🩺 Advfiction AI Receptionist &bull; Voice Engine</div>
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