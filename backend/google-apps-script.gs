/**
 * Google Apps Script — RSVP → Google Sheet bridge
 * =================================================
 * This receives RSVP submissions from the invitation backend and appends
 * them as rows in a Google Sheet.
 *
 * SETUP (one time):
 *  1. Create a Google Sheet (e.g. "Graduation RSVPs").
 *  2. In that Sheet: Extensions → Apps Script.
 *  3. Delete any sample code, paste EVERYTHING from this file.
 *  4. (Optional but recommended) change SECRET below to a private value and
 *     set the SAME value in the backend env var SHEETS_WEBHOOK_SECRET.
 *  5. Click Deploy → New deployment → type "Web app".
 *       - Description: RSVP webhook
 *       - Execute as:  Me
 *       - Who has access: Anyone
 *     Click Deploy, authorize the permissions, then COPY the Web app URL.
 *  6. Put that URL in the backend env var SHEETS_WEBHOOK_URL
 *     (locally in backend/.env, or in the Render dashboard → Environment).
 *  7. Re-deploy the backend / restart the server. Done.
 *
 * To update the script later you must Deploy → Manage deployments → Edit →
 * "New version", otherwise the old code keeps running.
 */

// Must match SHEETS_WEBHOOK_SECRET in the backend. Leave '' to skip the check.
var SECRET = '';

// Header columns written to the first row if the sheet is empty.
var HEADERS = ['Submitted At', 'Name', 'Attending', 'Guests', 'Message', 'ID'];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    sheet.appendRow([
      body.submittedAt || new Date().toISOString(),
      body.guestName || '',
      body.attending || '',
      body.guestCount || '',
      body.message || '',
      body.id || '',
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Lets you open the Web app URL in a browser to confirm it is deployed.
function doGet() {
  return json({ ok: true, service: 'rsvp-webhook' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
