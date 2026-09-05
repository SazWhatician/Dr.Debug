/**
 * 🩺 Dr. Debug — Google Sheets Newsletter & Release Mailer
 * 
 * Author: Saswat Mohanty (@SazWhatician)
 * GitHub: https://github.com/SazWhatician/DebugCopilot
 * LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/
 *
 * =========================================================================
 * 📋 HOW TO SET THIS UP IN 60 SECONDS (100% FREE, NO SERVERS):
 * =========================================================================
 * 1. Open Google Sheets (https://sheets.new) and create a new sheet.
 *    Name it: "Dr. Debug Newsletter Subscribers"
 *    In Row 1 (Header), add:
 *      Column A: Timestamp
 *      Column B: Email
 *      Column C: Source
 *      Column D: Status
 * 
 * 2. In Google Sheets top menu, click:
 *    Extensions > Apps Script
 * 
 * 3. Delete any code in the editor, paste this ENTIRE file into it, and click Save (Ctrl+S).
 * 
 * 4. Deploy the Web App (to receive emails from the website):
 *    - Click "Deploy" (top right blue button) > "New deployment"
 *    - Select type: "Web app" (click gear icon next to 'Select type')
 *    - Description: "Dr. Debug Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (CRITICAL: this allows the website to post emails)
 *    - Click "Deploy"
 *    - Authorize access when prompted by Google.
 *    - Copy the generated "Web App URL" (starts with https://script.google.com/macros/s/...)
 * 
 * 5. Paste that Web App URL into `landing/app.js`:
 *    `const GOOGLE_SHEET_ENDPOINT = 'YOUR_WEB_APP_URL_HERE'`
 * 
 * That's it! Every download will automatically record in your Google Sheet!
 * =========================================================================
 */

// =========================================================================
// PART 1: Webhook receiver (Captures emails from website download modal)
// =========================================================================
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload;
    
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    var email = payload.email || 'unknown';
    var source = payload.source || 'Website Download Modal';
    var timestamp = new Date();

    // Check if email already exists in sheet to avoid duplicates
    var data = sheet.getDataRange().getValues();
    var exists = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().toLowerCase() === email.toLowerCase()) {
        exists = true;
        break;
      }
    }

    if (!exists && email.indexOf('@') !== -1) {
      // Append: [Timestamp, Email, Source, Status]
      sheet.appendRow([timestamp, email, source, 'Active']);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', duplicate: exists }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Support GET requests for testing webhook liveness
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'online', service: 'Dr. Debug Newsletter Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}


// =========================================================================
// PART 2: 1-Click Update Mailer (Run this when releasing a new version!)
// =========================================================================
// Adds a custom menu directly into Google Sheets UI when you open the sheet:
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('\uD83E\uDE7A Dr. Debug')
    .addItem('\uD83D\uDE80 Broadcast Release Update Email', 'promptAndBroadcastUpdate')
    .addToUi();
}

/**
 * Interactive prompt that asks for the new version number and changelog,
 * then sends the styled email to all active subscribers.
 */
function promptAndBroadcastUpdate() {
  var ui = SpreadsheetApp.getUi();

  var versionPrompt = ui.prompt(
    '\uD83D\uDE80 Broadcast Dr. Debug Update',
    'Enter the new version (e.g. v0.2.1):',
    ui.ButtonSet.OK_CANCEL
  );

  if (versionPrompt.getSelectedButton() !== ui.Button.OK) return;
  var version = versionPrompt.getResponseText().trim();
  if (!version) version = 'v0.2.1';

  var changelogPrompt = ui.prompt(
    '\uD83D\uDCDD What is new in ' + version + '?',
    'Enter summary of updates (e.g. Added Claude 3.7 support & faster Docker logs):',
    ui.ButtonSet.OK_CANCEL
  );

  var changelog = changelogPrompt.getResponseText().trim() || 'New substrate diagnostic optimizations and engine upgrades.';

  var confirm = ui.alert(
    '\u26A0\uFE0F Confirm Broadcast',
    'Are you ready to send the update notification for ' + version + ' to all active subscribers?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var sentCount = 0;

  var subject = '\uD83E\uDE7A Dr. Debug ' + version + ' Released \u2014 Run npm update dr-debug';

  for (var i = 1; i < rows.length; i++) {
    var email = rows[i][1];
    var status = rows[i][3];

    // Only send to active, valid emails
    if (!email || email.indexOf('@') === -1 || status === 'Unsubscribed') continue;

    var plainText = 
      'Dr. Debug Update Available (' + version + ')\n\n' +
      'A new release of Dr. Debug (' + version + ') is now live on npm and GitHub.\n\n' +
      'What\'s New:\n' + changelog + '\n\n' +
      'UPDATE VIA NPM:\n' +
      'npm update dr-debug\n\n' +
      'UPDATE HOST MCP BRIDGE:\n' +
      'npx -y @dr-debug/mcp@latest\n\n' +
      'Chrome DevTools Extension:\n' +
      'Download updated ZIP from https://github.com/SazWhatician/Dr.Debug and reload in chrome://extensions\n\n' +
      'View full release: https://github.com/SazWhatician/Dr.Debug\n\n' +
      'Created by Saswat Mohanty (@SazWhatician) - Autonomous In-Browser AI Debugging\n' +
      'You received this because you subscribed when downloading Dr. Debug.';

    // High-Fashion Liquid Glassmorphic HTML Email
    // Uses transparent Dr. Debug PNG logo, frosted glass gradient panels,
    // and bulletproof email tables compatible across all major clients.
    var htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dr. Debug Release Update</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Outer Wrapper with Cyber Glass Glow -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #0b1524; background: linear-gradient(180deg, rgba(14, 26, 46, 0.95) 0%, rgba(7, 13, 23, 0.98) 100%); border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.25); box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.12); overflow: hidden;">
    
    <!-- Top Glowing Accent Line -->
    <tr>
      <td height="3" style="background: linear-gradient(90deg, #00f0ff 0%, #10b981 50%, #3b82f6 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
    </tr>

    <tr>
      <td style="padding: 36px 32px 30px 32px;">
        
        <!-- Brand Header (Backgroundless PNG Icon + Title + Version Badge) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 26px;">
          <tr>
            <!-- Backgroundless Dr. Debug PNG inside Frosted Glow Orb -->
            <td width="56" style="vertical-align: middle; padding-right: 16px;">
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 0 22px rgba(16, 185, 129, 0.28); text-align: center;">
                <img src="https://raw.githubusercontent.com/SazWhatician/Dr.Debug/main/landing/assets/drdebug.png" alt="Dr. Debug Logo" width="40" height="40" style="display: block; width: 40px; height: 40px; margin: 6px auto; border: 0; outline: none;" />
              </div>
            </td>
            
            <td style="vertical-align: middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-family: 'Consolas', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #34d399; background: rgba(16, 185, 129, 0.14); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 99px; padding: 3px 10px; margin-bottom: 6px;">
                      &#9679; RELEASE UPDATE &middot; ${version}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 23px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                      Dr. Debug
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Greeting -->
        <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin: 0 0 20px 0;">
          Hello fellow developer! A new release of <strong style="color: #ffffff; font-weight: 700;">Dr. Debug (${version})</strong> is live and ready for deployment across npm, Chrome, and your local AI coding assistant.
        </p>

        <!-- Glassmorphic Changelog Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 22px 0; background-color: #07151a; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.08) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);">
          <tr>
            <td style="padding: 20px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span style="font-family: 'Consolas', monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #34d399;">
                      &#10024; WHAT&#39;S NEW IN THIS PATCH
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">
                    ${changelog}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Cyber Terminal Quickstart Commands -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #050b14; background: rgba(3, 7, 18, 0.85); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 14px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);">
          <tr>
            <td style="padding: 22px 22px;">
              
              <!-- NPM Update Box -->
              <div style="margin-bottom: 18px;">
                <p style="margin: 0 0 8px 0; font-family: 'Consolas', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #94a3b8;">
                  <span style="color: #38bdf8; font-size: 13px;">&#9889;</span> UPDATE VIA NPM:
                </p>
                <div style="background-color: #020617; border: 1px solid #1e293b; border-left: 3px solid #10b981; border-radius: 8px; padding: 12px 16px; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #38bdf8;">
                  npm update dr-debug
                </div>
              </div>

              <!-- MCP Host Bridge Box -->
              <div>
                <p style="margin: 0 0 8px 0; font-family: 'Consolas', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #94a3b8;">
                  <span style="color: #10b981; font-size: 13px;">&#128268;</span> UPDATE HOST MCP BRIDGE:
                </p>
                <div style="background-color: #020617; border: 1px solid #1e293b; border-left: 3px solid #38bdf8; border-radius: 8px; padding: 12px 16px; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #38bdf8;">
                  npx -y @dr-debug/mcp@latest
                </div>
              </div>

            </td>
          </tr>
        </table>

        <!-- Chrome Extension Reload Tip -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.18); border-radius: 10px;">
          <tr>
            <td style="padding: 14px 16px; font-size: 13px; line-height: 1.55; color: #94a3b8;">
              <span style="color: #38bdf8; font-weight: 700;">Chrome DevTools Extension:</span> If using the unpacked extension, re-download the updated ZIP from GitHub or the official site and click <code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #e2e8f0; font-family: monospace;">Reload</code> in <span style="color: #38bdf8;">chrome://extensions</span>.
            </td>
          </tr>
        </table>

        <!-- Radiant CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0 24px 0;">
          <tr>
            <td align="center">
              <a href="https://github.com/SazWhatician/Dr.Debug" style="display: inline-block; background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 800; font-size: 14px; letter-spacing: 0.3px; text-decoration: none; padding: 14px 34px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.35); box-shadow: 0 12px 30px -5px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35);">
                View Full Release on GitHub &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0 18px 0;">
          <tr>
            <td height="1" style="background: rgba(255, 255, 255, 0.08); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="font-size: 11px; color: #64748b; margin: 0; line-height: 1.65; text-align: center;">
          Created by <strong style="color: #94a3b8;">Saswat Mohanty</strong> (<a href="https://github.com/SazWhatician" style="color: #10b981; text-decoration: none; font-weight: 600;">@SazWhatician</a>) &middot; Autonomous In-Browser AI Debugging<br>
          You received this because you subscribed when deploying Dr. Debug.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;

    try {
      GmailApp.sendEmail(email, subject, plainText, {
        htmlBody: htmlBody,
        name: 'Dr. Debug Releases'
      });
      sentCount++;
      Utilities.sleep(150); // Respect Gmail sending rates
    } catch (err) {
      Logger.log('Failed to send to: ' + email + ' error: ' + err);
    }
  }

  ui.alert('\uD83C\uDF89 Broadcast Complete!', 'Successfully sent update notification to ' + sentCount + ' subscriber(s).', ui.ButtonSet.OK);
}
